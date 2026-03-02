'use strict';
const express = require('express');
const router = express.Router();
const { ActivityService } = require('../services/activityService');
const { 
  validateActivityRequest,
  validateUserId 
} = require('../middleware/activityValidation');
const {
  activityErrorHandler,
  asyncErrorHandler,
  activityRequestLogger
} = require('../middleware/activityErrorHandler');

// Apply request logging to all activity routes
router.use(activityRequestLogger);

/**
 * GET /users/:userId/activities
 * Retrieve paginated activity events for a user
 */
router.get(
  '/:userId/activities',
  validateActivityRequest,
  asyncErrorHandler(async (req, res) => {
    const { validatedUserId, validatedQuery } = req;
    
    const result = await ActivityService.getUserActivities(validatedUserId, validatedQuery);
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * GET /users/:userId/activities/stats
 * Retrieve activity statistics for a user
 */
router.get(
  '/:userId/activities/stats',
  validateUserId,
  asyncErrorHandler(async (req, res) => {
    const { validatedUserId } = req;
    const { startDate, endDate } = req.query;
    
    const result = await ActivityService.getUserActivityStats(validatedUserId, {
      startDate,
      endDate
    });
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  })
);

// Apply activity-specific error handler to all routes in this router
router.use(activityErrorHandler);

module.exports = { activityRouter: router };