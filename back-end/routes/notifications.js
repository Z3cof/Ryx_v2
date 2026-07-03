const express = require('express');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const User = require('../models/User');

const router = express.Router();

// Enregistrer ou mettre à jour le pushToken de l'utilisateur
router.post('/register-token', requireAuth, asyncHandler(async (req, res) => {
  const { pushToken } = req.body;
  if (!pushToken) {
    return res.status(400).json({ error: 'pushToken requis.' });
  }
  await User.findByIdAndUpdate(req.authUserId, { pushToken });
  res.status(200).json({ success: true });
}));

// Supprimer le pushToken (désactivation des notifications par l'utilisateur)
router.delete('/unregister-token', requireAuth, asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.authUserId, { pushToken: null });
  res.status(200).json({ success: true });
}));

module.exports = router;
