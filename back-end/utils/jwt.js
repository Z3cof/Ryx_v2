const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;
if (!SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET doit être défini en production.');
}

if (
  process.env.NODE_ENV === 'production' &&
  SECRET &&
  /^change-moi-en-production$/i.test(SECRET.trim())
) {
  throw new Error('JWT_SECRET est un placeholder. Définis une vraie valeur en production.');
}

/** Clé de secours uniquement en développement */
const KEY = SECRET || 'ryx-dev-jwt-secret-change-me';

/**
 * @param {import('mongoose').Types.ObjectId | string} userId
 * @returns {string}
 */
function signUserToken(userId) {
  return jwt.sign({ sub: String(userId) }, KEY, { expiresIn: '30d' });
}

/**
 * @param {string} token
 * @returns {{ sub: string }}
 */
function verifyUserToken(token) {
  return jwt.verify(token, KEY);
}

module.exports = { signUserToken, verifyUserToken };
