'use strict';
const express = require('express');
const router = express.Router();
const { getUserActivities, parsePaginationParams, InvalidCursorError } = require('../services/activityService');
const { getUser } = require('../models/User');

/**
 * GET /activities/:userId
 * Retrieve activities for a specific user with pagination
 */
router.get('/:userId', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    
    // Validate user ID
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    // Check if user exists
    const user = await getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Parse pagination parameters
    const paginationOptions = parsePaginationParams(req.query);
    
    // Fetch activities
    const result = await getUserActivities(userId, paginationOptions);
    
    res.json(result);
  } catch (error) {
    if (error instanceof InvalidCursorError) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message.includes('Limit must be') || error.message.includes('Valid user ID')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

module.exports = { activitiesRouter: router };