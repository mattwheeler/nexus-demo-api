'use strict';
const express = require('express');
const router = express.Router();
const { getUser, createUser } = require('../models/User');
const { getUserActivities } = require('../models/Activity');
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
 * Get user activities with pagination support
 */
router.get('/:id/activity', validateActivityQuery, async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    
    // Validate user ID is a valid number
    if (isNaN(userId) || userId <= 0) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    // Check if user exists
    const user = await getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get user activities with pagination
    const result = await getUserActivities(userId, {
      limit: req.query.limit,
      cursor: req.query.cursor,
      type: req.query.type
    });
    
    // Format response
    const response = {
      activities: result.activities,
      pagination: {
        limit: result.pagination.limit,
        hasMore: result.pagination.hasMore
      }
    };
    
    // Include next cursor only if there are more results
    if (result.pagination.nextCursor) {
      response.pagination.nextCursor = result.pagination.nextCursor;
    }
    
    res.json(response);
    
  } catch (err) {
    // Handle database errors with 500 status
    err.status = 500;
    next(err);
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