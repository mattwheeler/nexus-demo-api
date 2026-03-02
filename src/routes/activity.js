'use strict';
const express = require('express');
const router = express.Router();
const { ActivityController } = require('../controllers/activityController');
const { 
  validateActivityRequest,
  validateUserId,
  validateActivityEventData
} = require('../middleware/activityValidation');
const {
  activityErrorHandler,
  asyncErrorHandler,
  activityRequestLogger
} = require('../middleware/activityErrorHandler');

// Apply request logging to all activity routes
router.use(activityRequestLogger);

/**
 * GET /users/:id/activity
 * Main endpoint - Retrieve paginated activity events for a user
 * This is the primary route specified in the task requirements
 */
router.get(
  '/:id/activity',
  validateActivityRequest,
  asyncErrorHandler(ActivityController.getUserActivity)
);

/**
 * GET /users/:id/activity/stats
 * Retrieve activity statistics for a user
 */
router.get(
  '/:id/activity/stats',
  validateUserId,
  asyncErrorHandler(ActivityController.getUserActivityStats)
);

/**
 * POST /users/:id/activity
 * Create a new activity event for a user
 */
router.post(
  '/:id/activity',
  validateUserId,
  validateActivityEventData,
  asyncErrorHandler(ActivityController.createUserActivity)
);

/**
 * GET /users/:userId/activities (legacy route for backward compatibility)
 * Retrieve paginated activity events for a user
 */
router.get(
  '/:userId/activities',
  validateActivityRequest,
  asyncErrorHandler(ActivityController.getUserActivity)
);

/**
 * GET /users/:userId/activities/stats (legacy route for backward compatibility)
 * Retrieve activity statistics for a user
 */
router.get(
  '/:userId/activities/stats',
  validateUserId,
  asyncErrorHandler(ActivityController.getUserActivityStats)
);

// Apply activity-specific error handler to all routes in this router
router.use(activityErrorHandler);

module.exports = { activityRouter: router };