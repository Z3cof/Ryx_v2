const { verifyUserToken } = require('../utils/jwt');

function send401(res, msg) {
  res.status(401);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({ error: msg }));
}

function send403(res, msg) {
  res.status(403);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({ error: msg }));
}

/** JWT Bearer obligatoire ; remplit req.authUserId (string Mongo _id). */
function requireAuth(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) {
    return send401(res, 'Non authentifié.');
  }
  try {
    const payload = verifyUserToken(h.slice(7).trim());
    req.authUserId = payload.sub;
    next();
  } catch {
    return send401(res, 'Session invalide ou expirée.');
  }
}

/** À utiliser après requireAuth sur les routes avec :userId dans l’URL. */
function matchRouteUserId(req, res, next) {
  const p = req.params.userId;
  if (!p || String(p) !== String(req.authUserId)) {
    return send403(res, 'Accès refusé.');
  }
  next();
}

/** À utiliser après requireAuth sur POST dont le body contient userId. */
function matchBodyUserId(req, res, next) {
  const u = req.body?.userId;
  if (!u || String(u) !== String(req.authUserId)) {
    return send403(res, 'Accès refusé.');
  }
  next();
}

module.exports = {
  requireAuth,
  matchRouteUserId,
  matchBodyUserId,
};
