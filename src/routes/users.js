'use strict';
const express = require('express');
const router = express.Router();
const { getUser, createUser } = require('../models/User');
const { validateUserActivity } = require('../middleware/validateUserActivity');
const { getUserActivities } = require('../services/userActivityService');
const { checkUserExists } = require('../services/userExistenceService');
const { createUserActivityError } = require('../utils/userActivityErrors');

/** GET /users/:id */
router.get('/:id', async (req, res, next) => {
  try {
    const user = await getUser(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) { next(err); }
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

/**
 * GET /users/:user_id/activity
 * Retrieves paginated activity events for a specific user
 * 
 * @route GET /users/:user_id/activity
 * @param {number} user_id - User ID (path parameter)
 * @param {number} [limit=10] - Number of activities to return (1-50)
 * @param {number} [offset=0] - Number of activities to skip
 * @returns {Object} JSON response with activities array and pagination metadata
 */
router.get('/:user_id/activity', validateUserActivity, async (req, res, next) => {
  try {
    const { user_id } = req.params;
    const { limit, offset } = req.query;
    
    // Check if user exists before querying activities
    const userExists = await checkUserExists(user_id);
    if (!userExists) {
      const error = createUserActivityError('USER_NOT_FOUND', `User with ID ${user_id} not found`);
      return res.status(error.statusCode).json({
        error: error.message
      });
    }
    
    // Retrieve activities with pagination
    const result = await getUserActivities(user_id, { limit, offset });
    
    // Format response with pagination metadata
    const response = {
      activities: result.activities,
      pagination: {
        limit,
        offset,
        total: result.total,
        hasMore: (offset + limit) < result.total
      }
    };
    
    res.json(response);
  } catch (error) {
    // Handle database or other service errors
    if (error.type === 'DATABASE_ERROR') {
      return res.status(error.statusCode).json({
        error: error.message
      });
    }
    
    // Pass unexpected errors to global error handler
    next(error);
  }
});

module.exports = { usersRouter: router };