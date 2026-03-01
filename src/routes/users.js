'use strict';
const express = require('express');
const router = express.Router();
const { getUser, createUser } = require('../models/User');
const { getUserActivity } = require('../services/activityService');
const { validateActivityQuery } = require('../middleware/validateActivityQuery');

/** GET /users/:id */
router.get('/:id', async (req, res, next) => {
  try {
    const user = await getUser(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) { next(err); }
});

/**
 * GET /users/:id/activity
 * Retrieves activity events for a specific user with pagination support
 */
router.get('/:id/activity', validateActivityQuery, async (req, res, next) => {
  try {
    const userId = req.params.id;
    const { limit, offset, type } = req.query;
    
    // Validate user ID is a valid number
    const userIdNum = parseInt(userId, 10);
    if (isNaN(userIdNum) || userIdNum <= 0) {
      return res.status(400).json({ 
        error: 'Invalid user ID. Must be a positive integer.' 
      });
    }
    
    const activityData = await getUserActivity(userIdNum, {
      limit,
      offset,
      type
    });
    
    res.status(200).json({
      success: true,
      data: {
        user_id: userIdNum,
        activities: activityData.activities,
        pagination: activityData.pagination
      }
    });
  } catch (error) {
    // Handle specific error cases
    if (error.status === 404) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }
    
    // Let the error handler deal with other errors
    next(error);
  }
});

/** POST /users */
router.post('/', async (req, res, next) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'name and email are required' });
    const user = await createUser({ name, email });
    res.status(201).json({ user });
  } catch (err) { next(err); }
});

module.exports = { usersRouter: router };