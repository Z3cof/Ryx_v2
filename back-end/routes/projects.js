const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { requireAuth, matchRouteUserId } = require('../middleware/auth');
const projectController = require('../controllers/projectController');

const router = express.Router();

router.get('/:userId', requireAuth, matchRouteUserId, asyncHandler(projectController.listProjects));
router.post('/:userId', requireAuth, matchRouteUserId, asyncHandler(projectController.createProject));
router.patch('/:userId/:projectId', requireAuth, matchRouteUserId, asyncHandler(projectController.patchProject));
router.delete('/:userId/:projectId', requireAuth, matchRouteUserId, asyncHandler(projectController.deleteProject));
router.post(
  '/:userId/:projectId/contribute',
  requireAuth,
  matchRouteUserId,
  asyncHandler(projectController.addContribution)
);
router.post(
  '/:userId/:projectId/auto-fill',
  requireAuth,
  matchRouteUserId,
  asyncHandler(projectController.applyAutoFill)
);

module.exports = router;
