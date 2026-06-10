const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { requireAuth, matchRouteUserId } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

const router = express.Router();

router.get('/:userId', requireAuth, matchRouteUserId, asyncHandler(dashboardController.getDashboard));

module.exports = router;
