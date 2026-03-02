'use strict';
const express = require('express');
const router = express.Router();
const { getUser, createUser } = require('../models/User');
const { ActivityService } = require('../services/ActivityService');
const { validateQuery } = require('../middleware/validateQuery');
const { activityQuerySchema } = require('../validation/activityValidation');

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
 * Get paginated activities for a specific user
 */
router.get('/:id/activity', validateQuery(activityQuerySchema), async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    
    // Validate user ID is a positive integer
    if (isNaN(userId) || userId <= 0) {
      return res.status(400).json({ 
        error: 'Invalid user ID. Must be a positive integer.' 
      });
    }

    // Check if user exists
    const user = await getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get activities with pagination
    const result = await ActivityService.getUserActivities(userId, req.query);
    
    // Set appropriate headers
    res.set({
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    
    res.status(200).json(result);
  } catch (err) {
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