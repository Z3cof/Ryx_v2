const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { requireAuth, matchRouteUserId } = require('../middleware/auth');
const shopController = require('../controllers/shopController');

const router = express.Router();

router.get('/:userId/orders', requireAuth, matchRouteUserId, asyncHandler(shopController.listOrders));
router.post('/:userId/orders', requireAuth, matchRouteUserId, asyncHandler(shopController.createOrder));
router.patch('/:userId/orders/:orderId', requireAuth, matchRouteUserId, asyncHandler(shopController.patchOrder));

router.get('/:userId/products/:productId', requireAuth, matchRouteUserId, asyncHandler(shopController.getProduct));
router.post('/:userId/products', requireAuth, matchRouteUserId, asyncHandler(shopController.createProduct));
router.patch('/:userId/products/:productId', requireAuth, matchRouteUserId, asyncHandler(shopController.updateProduct));
router.delete('/:userId/products/:productId', requireAuth, matchRouteUserId, asyncHandler(shopController.deleteProduct));

router.get('/:userId', requireAuth, matchRouteUserId, asyncHandler(shopController.getShopSummary));

module.exports = router;
