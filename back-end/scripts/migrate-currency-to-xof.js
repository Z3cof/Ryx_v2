/**
 * Migre toutes les devises stockées vers XOF (franc CFA UEMOA).
 * - Wallets: si l'utilisateur a déjà un portefeuille XOF, les soldes des autres
 *   devises sont additionnés puis les documents non-XOF sont supprimés (index unique).
 * - Transactions, MonthlyBalance, MonthlyBudget: champ currency → XOF.
 *
 * Usage:
 *   node scripts/migrate-currency-to-xof.js
 *   node scripts/migrate-currency-to-xof.js --dry-run
 *
 * Requiert MONGO_URI dans .env (répertoire back-end).
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const MonthlyBalance = require('../models/MonthlyBalance');
const MonthlyBudget = require('../models/MonthlyBudget');

function isXOF(c) {
  return String(c ?? '').trim().toUpperCase() === 'XOF';
}

const DRY_RUN = process.argv.includes('--dry-run');

async function migrateWallets() {
  const all = (await Wallet.find({}).lean()).map((d) => ({ ...d }));
  const todo = all.filter((w) => !isXOF(w.currency));

  let merged = 0;
  let renamed = 0;
  let skipped = 0;

  for (const w of todo) {
    if (!all.some((x) => String(x._id) === String(w._id))) continue;

    const sameUser = all.filter((x) => String(x.userId) === String(w.userId));
    const xofWallet = sameUser.find((x) => isXOF(x.currency) && String(x._id) !== String(w._id));

    if (xofWallet) {
      if (DRY_RUN) {
        merged += 1;
        const idx = all.findIndex((x) => String(x._id) === String(w._id));
        if (idx !== -1) {
          const base = all.find((x) => String(x._id) === String(xofWallet._id));
          if (base) base.balance = (Number(base.balance) || 0) + (Number(w.balance) || 0);
          all.splice(idx, 1);
        }
        continue;
      }
      await Wallet.findByIdAndUpdate(xofWallet._id, {
        $inc: { balance: Number(w.balance) || 0 },
      });
      await Wallet.deleteOne({ _id: w._id });
      merged += 1;
      const idx = all.findIndex((x) => String(x._id) === String(w._id));
      if (idx !== -1) all.splice(idx, 1);
      const base = all.find((x) => String(x._id) === String(xofWallet._id));
      if (base) base.balance = (Number(base.balance) || 0) + (Number(w.balance) || 0);
      continue;
    }

    if (DRY_RUN) {
      renamed += 1;
      const local = all.find((x) => String(x._id) === String(w._id));
      if (local) local.currency = 'XOF';
      continue;
    }

    try {
      await Wallet.findByIdAndUpdate(w._id, { $set: { currency: 'XOF' } });
    } catch (e) {
      if (e && e.code === 11000) {
        skipped += 1;
        console.warn(
          `[Wallet] Doublon XOF userId=${w.userId} walletId=${w._id}: ${e.message} — fusion manuelle possible.`
        );
        continue;
      }
      throw e;
    }
    renamed += 1;
    const local = all.find((x) => String(x._id) === String(w._id));
    if (local) local.currency = 'XOF';
  }

  console.log(
    `[Wallet] ${DRY_RUN ? '(dry-run) ' : ''}fusionnés: ${merged}, renommés en XOF: ${renamed}, ignorés: ${skipped}`
  );
}

async function setCollectionCurrency(Model, label) {
  const filterFixed = {
    $or: [
      { currency: { $exists: false } },
      { currency: null },
      { currency: '' },
      {
        $expr: {
          $ne: [{ $toUpper: { $trim: { input: { $ifNull: ['$currency', ''] } } } }, 'XOF'],
        },
      },
    ],
  };

  if (DRY_RUN) {
    const n = await Model.countDocuments(filterFixed);
    console.log(`[${label}] (dry-run) documents à normaliser: ${n}`);
    return;
  }

  const res = await Model.updateMany(filterFixed, { $set: { currency: 'XOF' } });
  console.log(`[${label}] modifiés: ${res.modifiedCount} (match: ${res.matchedCount})`);
}

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI manquant dans .env');
    process.exit(1);
  }

  console.log(DRY_RUN ? 'Mode dry-run — aucune écriture en base.' : 'Migration en cours…');
  await mongoose.connect(process.env.MONGO_URI);

  try {
    await migrateWallets();
    await setCollectionCurrency(Transaction, 'Transaction');
    await setCollectionCurrency(MonthlyBalance, 'MonthlyBalance');
    await setCollectionCurrency(MonthlyBudget, 'MonthlyBudget');
    console.log('Terminé.');
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
