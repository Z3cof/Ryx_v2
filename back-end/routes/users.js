const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { requireAuth, matchRouteUserId } = require('../middleware/auth');
const userController = require('../controllers/userController');

const router = express.Router();

router.patch('/:userId/phone', requireAuth, matchRouteUserId, asyncHandler(userController.updatePhone));
router.patch('/:userId/password', requireAuth, matchRouteUserId, asyncHandler(userController.changePassword));
router.delete('/:userId', requireAuth, matchRouteUserId, asyncHandler(userController.deleteAccount));
router.patch('/:userId', requireAuth, matchRouteUserId, asyncHandler(userController.updateUser));

module.exports = router;
