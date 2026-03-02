'use strict';
const express = require('express');
const router = express.Router();
const { ActivityService } = require('../services/ActivityService');
const { validatePagination } = require('../middleware/validatePagination');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * GET /users/:userId/activities
 * Get user activities with pagination
 */
router.get('/:userId/activities', 
  validatePagination,
  asyncHandler(async (req, res) => {
    const userId = parseInt(req.params.userId, 10);
    
    // Validate userId is a number
    if (isNaN(userId) || userId < 1) {
      return res.status(400).json({
        error: 'Invalid user ID',
        code: 'INVALID_USER_ID'
      });
    }

    const { limit, cursor, order } = req.query;
    
    const result = await ActivityService.getUserActivities(userId, {
      limit,
      cursor,
      order
    });

    res.json({
      success: true,
      activities: result.data,
      pagination: result.pagination
    });
  })
);

/**
 * POST /users/:userId/activities
 * Create a new activity for a user
 */
router.post('/:userId/activities',
  asyncHandler(async (req, res) => {
    const userId = parseInt(req.params.userId, 10);
    
    // Validate userId is a number
    if (isNaN(userId) || userId < 1) {
      return res.status(400).json({
        error: 'Invalid user ID',
        code: 'INVALID_USER_ID'
      });
    }

    const { event_type, metadata } = req.body;
    
    // Basic validation
    if (!event_type) {
      return res.status(400).json({
        error: 'event_type is required',
        code: 'VALIDATION_ERROR'
      });
    }

    const activity = await ActivityService.createActivity(userId, {
      event_type,
      metadata
    });

    res.status(201).json({
      success: true,
      activity
    });
  })
);

module.exports = { activityRouter: router };