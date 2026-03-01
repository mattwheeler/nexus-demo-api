'use strict';
const express = require('express');
const router = express.Router();
const { getUser, createUser } = require('../models/User');
const { getUserActivities } = require('../models/Activity');
const { formatActivityResponse, formatUserResponse } = require('../utils/responseFormatter');
const { validateRequest } = require('../middleware/validateRequest');
const { z } = require('zod');

// Validation schema for activity query parameters
const activityQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20).optional()
});

/** GET /users/:id */
router.get('/:id', async (req, res, next) => {
  try {
    const user = await getUser(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const formattedUser = formatUserResponse(user);
    res.json({ user: formattedUser });
  } catch (err) { 
    next(err); 
  }
});

/** GET /users/:id/activity */
router.get('/:id/activity', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    
    // Validate user exists
    const user = await getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Validate query parameters
    const queryValidation = activityQuerySchema.safeParse(req.query);
    if (!queryValidation.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        issues: queryValidation.error.issues.map(i => ({ 
          path: i.path.join('.'), 
          message: i.message 
        }))
      });
    }
    
    const { cursor, limit } = queryValidation.data;
    
    // Get user activities
    const result = await getUserActivities(userId, { cursor, limit });
    
    // Format response
    const formattedResponse = formatActivityResponse(
      result.activities,
      result.pagination
    );
    
    res.json(formattedResponse);
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
    const formattedUser = formatUserResponse(user);
    res.status(201).json({ user: formattedUser });
  } catch (err) { 
    next(err); 
  }
});

module.exports = { usersRouter: router };