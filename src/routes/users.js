'use strict';
const express = require('express');
const router = express.Router();
const { getUser, createUser } = require('../models/User');
const { getUserActivities, parsePaginationParams, InvalidCursorError } = require('../services/activityService');

/** GET /users/:id */
router.get('/:id', async (req, res, next) => {
  try {
    const user = await getUser(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) { next(err); }
});

/** GET /users/:id/activity */
router.get('/:id/activity', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    
    // Validate user ID
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    // Check if user exists
    const user = await getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Parse pagination parameters with validation
    let paginationOptions;
    try {
      paginationOptions = parsePaginationParams(req.query);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
    
    // Get activities
    const result = await getUserActivities(userId, paginationOptions);
    
    // Format response
    const response = {
      activities: result.activities,
      pagination: {
        limit: result.limit,
        hasNext: result.hasNext,
        nextCursor: result.nextCursor
      }
    };
    
    res.json(response);
    
  } catch (err) {
    if (err instanceof InvalidCursorError) {
      return res.status(400).json({ error: err.message });
    }
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