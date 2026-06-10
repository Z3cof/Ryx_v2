const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { requireAuth, matchRouteUserId } = require('../middleware/auth');
const expensesController = require('../controllers/expensesController');

const router = express.Router();

// Routes spécifiques avant /:userId
router.get('/summary/:userId', requireAuth, matchRouteUserId, asyncHandler(expensesController.getSummary));
router.get('/income/:userId', requireAuth, matchRouteUserId, asyncHandler(expensesController.getIncomeByMonth));
router.get('/threshold/:userId', requireAuth, matchRouteUserId, asyncHandler(expensesController.getThreshold));
router.put('/threshold/:userId', requireAuth, matchRouteUserId, asyncHandler(expensesController.setThreshold));
router.get('/:userId', requireAuth, matchRouteUserId, asyncHandler(expensesController.getByMonth));

module.exports = router;
