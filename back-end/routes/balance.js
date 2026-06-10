const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { requireAuth, matchRouteUserId } = require('../middleware/auth');
const balanceController = require('../controllers/balanceController');

const router = express.Router();

router.get('/:userId', requireAuth, matchRouteUserId, asyncHandler(balanceController.getMonthlyBalance));
router.put('/:userId', requireAuth, matchRouteUserId, asyncHandler(balanceController.setMonthlyBalance));

module.exports = router;
