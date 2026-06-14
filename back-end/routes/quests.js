const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { requireAuth, matchRouteUserId } = require('../middleware/auth');
const { listQuests, generateQuests, completeQuest, getProgress } = require('../controllers/questController');

const router = express.Router();

/** GET  /api/quests/:userId           → quêtes actives + progression */
router.get('/:userId', requireAuth, matchRouteUserId, asyncHandler(listQuests));

/** GET  /api/quests/:userId/progress  → XP, niveau, streak */
router.get('/:userId/progress', requireAuth, matchRouteUserId, asyncHandler(getProgress));

/** POST /api/quests/:userId/generate  → Rixy génère de nouvelles quêtes */
router.post('/:userId/generate', requireAuth, matchRouteUserId, asyncHandler(generateQuests));

/** PATCH /api/quests/:userId/:questId/complete → compléter une quête */
router.patch('/:userId/:questId/complete', requireAuth, matchRouteUserId, asyncHandler(completeQuest));

module.exports = router;
