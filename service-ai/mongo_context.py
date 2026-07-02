"""Lecture MongoDB (même URI / collections que le back Ryx) pour enrichir le chat."""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from bson.errors import InvalidId
from pymongo import MongoClient
from pymongo.errors import PyMongoError

log = logging.getLogger(__name__)

_client: Optional[MongoClient] = None


def _get_client() -> Optional[MongoClient]:
    global _client
    uri = os.getenv("MONGO_URI", "").strip()
    if not uri:
        return None
    if _client is None:
        _client = MongoClient(uri, serverSelectionTimeoutMS=5000)
    return _client


def _default_db(client: MongoClient):
    try:
        db = client.get_default_database()
        if db is not None:
            return db
    except Exception as e:
        print(f"[Ryx AI] get_default_database configuration error: {e}")
    name = (os.getenv("MONGO_DB_NAME") or "ryxdb").strip() or "ryxdb"
    return client[name]


def _month_start(now: datetime) -> datetime:
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _recurring_monthly_estimate(amount: float, cadence: str) -> float:
    c = (cadence or "month").lower()
    if c == "day":
        return amount * 30
    if c == "week":
        return amount * 4
    return amount


def _fmt_xof(value: float) -> str:
    return f"{value:,.0f}".replace(",", " ")


def build_user_finance_context(user_mongo_id: str, locale: str) -> str:
    """
    Résumé financier + profil pour le prompt (aucune donnée si URI absente ou erreur).
    """
    print(f"[Ryx AI] build_user_finance_context called for user_mongo_id: '{user_mongo_id}'")
    try:
        oid = ObjectId(user_mongo_id.strip())
    except InvalidId as e:
        print(f"[Ryx AI] Invalid user ID: '{user_mongo_id}' (error: {e})")
        return ""

    client = _get_client()
    if not client:
        print("[Ryx AI] No MongoClient found (MONGO_URI empty)")
        return ""

    try:
        db = _default_db(client)
        print(f"[Ryx AI] Connected to DB: '{db.name}'")
        users = db["users"]
        transactions = db["transactions"]
        recurring = db["recurringrules"]
        monthly_budgets = db["monthlybudgets"]
        monthly_balances = db["monthlybalances"]
        project_goals = db["projectgoals"]
        products = db["products"]
        shop_orders = db["shoporders"]

        user = users.find_one(
            {"_id": oid},
            projection={"name": 1, "isMerchant": 1, "countryIso": 1, "phoneE164": 1},
        )
        if not user:
            print(f"[Ryx AI] User '{user_mongo_id}' not found in DB '{db.name}'")
            return ""
        print(f"[Ryx AI] Found user: '{user.get('name')}' in DB")

        # Resolve user currency dynamically
        currency = "XOF"
        wallet = db["wallets"].find_one({"userId": oid})
        if wallet and wallet.get("currency"):
            currency = str(wallet.get("currency")).strip().upper()
        else:
            country_iso = str(user.get("countryIso") or "").strip().upper()
            if country_iso:
                currency_map = {
                    "FR": "EUR", "BE": "EUR", "CA": "CAD", "US": "USD",
                    "CD": "CDF", "CG": "XAF", "CM": "XAF", "CI": "XOF",
                    "SN": "XOF", "ML": "XOF", "BF": "XOF", "NE": "XOF",
                    "TG": "XOF", "BJ": "XOF", "GN": "GNF", "MA": "MAD",
                    "DZ": "DZD", "TN": "TND"
                }
                currency = currency_map.get(country_iso, "XOF")


        now = datetime.now(timezone.utc)
        start_month = _month_start(now)
        year, month = now.year, now.month
        en = locale == "en"

        match_month = {"userId": oid, "createdAt": {"$gte": start_month}}
        pipeline_type = [
            {"$match": match_month},
            {"$group": {"_id": "$type", "total": {"$sum": "$amount"}}},
        ]
        month_by_type: dict[str, float] = {}
        for row in transactions.aggregate(pipeline_type):
            month_by_type[str(row.get("_id") or "")] = float(row.get("total") or 0)

        month_in = month_by_type.get("in", 0.0)
        month_out = month_by_type.get("out", 0.0)
        month_net = month_in - month_out

        pipeline_cat = [
            {"$match": {**match_month, "type": "out"}},
            {"$group": {"_id": "$category", "total": {"$sum": "$amount"}}},
            {"$sort": {"total": -1}},
            {"$limit": 8},
        ]
        top_categories: list[str] = []
        for row in transactions.aggregate(pipeline_cat):
            cat = str(row.get("_id") or "—").strip() or "—"
            top_categories.append(f"{cat}: {_fmt_xof(float(row.get('total') or 0))} {currency}")

        budget_doc = monthly_budgets.find_one(
            {"userId": oid, "year": year, "month": month},
            projection={"amount": 1, "currency": 1},
        )
        balance_doc = monthly_balances.find_one(
            {"userId": oid, "year": year, "month": month},
            projection={"balance": 1, "currency": 1},
        )

        rec_in = 0.0
        rec_out = 0.0
        rec_lines: list[str] = []
        for rule in recurring.find({"userId": oid, "isActive": True}).limit(20):
            amt = float(rule.get("amount") or 0)
            est = _recurring_monthly_estimate(amt, str(rule.get("cadence") or "month"))
            typ = str(rule.get("type") or "out")
            if typ == "in":
                rec_in += est
            else:
                rec_out += est
            title = str(rule.get("title") or "—").strip()
            rec_lines.append(
                f"- {title} ({typ}) ~{_fmt_xof(est)} {currency}/mois"
                if not en
                else f"- {title} ({typ}) ~{_fmt_xof(est)} {currency}/month"
            )

        project_lines: list[str] = []
        for proj in project_goals.find({"userId": oid}).sort("createdAt", -1).limit(5):
            title = str(proj.get("title") or "—").strip()
            target = float(proj.get("targetAmount") or 0)
            current = float(proj.get("currentAmount") or 0)
            pct = int((current / target) * 100) if target > 0 else 0
            project_lines.append(
                f"- {title}: {_fmt_xof(current)} / {_fmt_xof(target)} {currency} ({pct} %)"
                if not en
                else f"- {title}: {_fmt_xof(current)} / {_fmt_xof(target)} {currency} ({pct}%)"
            )

        merchant_block = ""
        if user.get("isMerchant"):
            product_count = products.count_documents({"merchantId": oid})
            pending_orders = shop_orders.count_documents(
                {"merchantId": oid, "status": "pending"}
            )
            month_orders = shop_orders.count_documents(
                {"merchantId": oid, "createdAt": {"$gte": start_month}}
            )
            pipeline_shop = [
                {
                    "$match": {
                        "merchantId": oid,
                        "status": {"$in": ["confirmed", "delivered"]},
                        "createdAt": {"$gte": start_month},
                    }
                },
                {"$group": {"_id": None, "total": {"$sum": "$totalAmount"}}},
            ]
            shop_revenue = 0.0
            for row in shop_orders.aggregate(pipeline_shop):
                shop_revenue = float(row.get("total") or 0)
            if en:
                merchant_block = (
                    f"Shop (seller): {product_count} products, {month_orders} orders this month, "
                    f"{pending_orders} pending, confirmed revenue this month ~{_fmt_xof(shop_revenue)} {currency}\n"
                )
            else:
                merchant_block = (
                    f"Boutique (vendeur) : {product_count} produits, {month_orders} commandes ce mois, "
                    f"{pending_orders} en attente, CA confirmé ce mois ~{_fmt_xof(shop_revenue)} {currency}\n"
                )

        cursor = (
            transactions.find(
                {"userId": oid},
                projection={
                    "title": 1,
                    "amount": 1,
                    "currency": 1,
                    "type": 1,
                    "category": 1,
                    "createdAt": 1,
                },
            )
            .sort("createdAt", -1)
            .limit(35)
        )

        tx_lines: list[str] = []
        for doc in cursor:
            created = doc.get("createdAt")
            if isinstance(created, datetime):
                dstr = created.strftime("%Y-%m-%d")
            else:
                dstr = str(created)[:10] if created else ""
            title = str(doc.get("title") or "").strip() or "—"
            amount = doc.get("amount")
            cur = str(doc.get("currency") or "XOF")
            typ = str(doc.get("type") or "out")
            cat = str(doc.get("category") or "")
            tx_lines.append(f"- {dstr} · {typ} · {amount} {cur} · {cat} · {title}")

        name = str(user.get("name") or "").strip() or "—"
        country = str(user.get("countryIso") or "").strip() or "—"
        merchant = bool(user.get("isMerchant"))

        budget_line = ""
        if budget_doc:
            b_amt = float(budget_doc.get("amount") or 0)
            remaining = b_amt - month_out
            if en:
                budget_line = (
                    f"Monthly spending cap: {_fmt_xof(b_amt)} {currency} — spent {_fmt_xof(month_out)} {currency} "
                    f"(remaining ~{_fmt_xof(max(0, remaining))} {currency})\n"
                )
            else:
                budget_line = (
                    f"Plafond dépenses du mois : {_fmt_xof(b_amt)} {currency} — déjà dépensé {_fmt_xof(month_out)} {currency} "
                    f"(reste ~{_fmt_xof(max(0, remaining))} {currency})\n"
                )

        balance_line = ""
        if balance_doc is not None:
            bal = float(balance_doc.get("balance") or 0)
            balance_line = (
                f"Declared monthly balance: {_fmt_xof(bal)} {currency}\n"
                if en
                else f"Solde mensuel déclaré : {_fmt_xof(bal)} {currency}\n"
            )

        rec_block = ""
        if rec_lines:
            rec_header = (
                f"Active recurring (~monthly): income ~{_fmt_xof(rec_in)} {currency}, expenses ~{_fmt_xof(rec_out)} {currency}\n"
                if en
                else f"Récurrents actifs (estim. mensuel) : entrées ~{_fmt_xof(rec_in)} {currency}, sorties ~{_fmt_xof(rec_out)} {currency}\n"
            )
            rec_block = rec_header + "\n".join(rec_lines[:12]) + "\n"

        proj_block = ""
        if project_lines:
            proj_block = (
                ("Savings projects:\n" if en else "Projets d'épargne :\n")
                + "\n".join(project_lines)
                + "\n"
            )

        cat_block = ""
        if top_categories:
            cat_block = (
                ("Top expense categories this month:\n" if en else "Top catégories de dépenses ce mois :\n")
                + "\n".join(top_categories)
                + "\n"
            )

        if en:
            header = "--- Ryx user data (confidential; this user only) ---\n"
            profile = f"Profile: {name}, country: {country}, merchant account: {'yes' if merchant else 'no'}\n"
            summary = (
                f"Current month (UTC): inflows {_fmt_xof(month_in)} {currency}, outflows {_fmt_xof(month_out)} {currency}, "
                f"net {_fmt_xof(month_net)} {currency}\n"
            )
            tx_header = f"Recent transactions ({len(tx_lines)} shown):\n"
            empty_tx = "(no transactions)\n"
        else:
            header = "--- Données Ryx (confidentiel ; cet utilisateur uniquement) ---\n"
            profile = f"Profil : {name}, pays : {country}, compte vendeur : {'oui' if merchant else 'non'}\n"
            summary = (
                f"Mois en cours (UTC) : entrées {_fmt_xof(month_in)} {currency}, sorties {_fmt_xof(month_out)} {currency}, "
                f"net {_fmt_xof(month_net)} {currency}\n"
            )
            tx_header = f"Dernières opérations ({len(tx_lines)} affichées) :\n"
            empty_tx = "(aucune opération)\n"

        body = "\n".join(tx_lines) if tx_lines else empty_tx.strip()

        parts = [
            header,
            profile,
            summary,
            balance_line,
            budget_line,
            cat_block,
            rec_block,
            proj_block,
            merchant_block,
            tx_header,
            body,
            "---\n",
        ]
        return "".join(p for p in parts if p)

    except Exception as e:
        print(f"[Ryx AI] Exception building user finance context: {e}")
        import traceback
        traceback.print_exc()
        return ""


def test_mongo_connection() -> dict:
    uri = os.getenv("MONGO_URI", "").strip()
    if not uri:
        return {"configured": False, "connected": False, "error": "MONGO_URI env var is empty"}
    try:
        # Short timeout to avoid blocking the health endpoint if it is down
        client = MongoClient(uri, serverSelectionTimeoutMS=2000)
        client.admin.command('ping')
        db = _default_db(client)
        user_count = db["users"].count_documents({})
        return {
            "configured": True,
            "connected": True,
            "database": db.name,
            "user_count": user_count
        }
    except Exception as e:
        return {
            "configured": True,
            "connected": False,
            "error": str(e)
        }
