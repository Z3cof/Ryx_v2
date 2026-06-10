const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { requireAuth, matchRouteUserId } = require('../middleware/auth');
const recurringController = require('../controllers/recurringController');

const router = express.Router();

router.post('/:userId/ensure-month', requireAuth, matchRouteUserId, asyncHandler(recurringController.ensureMonth));
router.get('/:userId', requireAuth, matchRouteUserId, asyncHandler(recurringController.listRules));
router.post('/:userId', requireAuth, matchRouteUserId, asyncHandler(recurringController.createRule));
router.patch('/:userId/:ruleId', requireAuth, matchRouteUserId, asyncHandler(recurringController.patchRule));
router.delete('/:userId/:ruleId', requireAuth, matchRouteUserId, asyncHandler(recurringController.deleteRule));

module.exports = router;
