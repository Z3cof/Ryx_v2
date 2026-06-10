const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { requireAuth, matchBodyUserId } = require('../middleware/auth');
const transactionController = require('../controllers/transactionController');

const router = express.Router();

router.post('/', requireAuth, matchBodyUserId, asyncHandler(transactionController.createExpense));
router.patch('/:transactionId', requireAuth, asyncHandler(transactionController.updateTransaction));
router.delete('/:transactionId', requireAuth, asyncHandler(transactionController.deleteTransaction));

module.exports = router;
