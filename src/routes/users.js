'use strict';
const express = require('express');
const router = express.Router();
const { getUser, createUser } = require('../models/User');
const { validateUserActivity } = require('../middleware/validateUserActivity');
const { getUserActivity } = require('../services/userActivityService');
const {
  handleUserNotFound,
  handleDatabaseError,
  handleValidationError,
  handleGenericError,
  UserNotFoundError
} = require('../utils/errorHandlers');

/** GET /users/:id */
router.get('/:id', async (req, res, next) => {
  try {
    const user = await getUser(req.params.id);
    if (!user) {
      return handleUserNotFound(res, req.params.id);
    }
    res.json({ user });
  } catch (err) {
    return handleGenericError(res, err, 'user retrieval');
  }
});

/** GET /users/:user_id/activity */
router.get('/:user_id/activity', validateUserActivity, async (req, res, next) => {
  try {
    const { user_id } = req.params;
    const { limit, offset } = req.query;
    
    // Check if user exists first
    const user = await getUser(user_id);
    if (!user) {
      return handleUserNotFound(res, user_id);
    }
    
    // Get user activity
    const result = await getUserActivity(user_id, { limit, offset });
    
    res.json({
      user_id,
      limit,
      offset,
      total: result.total,
      activities: result.activities
    });
  } catch (err) {
    return handleGenericError(res, err, 'user activity retrieval');
  }
});

/** POST /users */
router.post('/', async (req, res, next) => {
  try {
    const { name, email } = req.body;
    
    // Validate required fields
    if (!name || !email) {
      return handleValidationError(
        res,
        'Missing required fields',
        [
          ...(name ? [] : [{ field: 'name', message: 'name is required' }]),
          ...(email ? [] : [{ field: 'email', message: 'email is required' }])
        ]
      );
    }
    
    const user = await createUser({ name, email });
    res.status(201).json({ user });
  } catch (err) {
    // Handle unique constraint violation for email
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return handleValidationError(
        res,
        'Email already exists',
        [{ field: 'email', message: 'email must be unique' }]
      );
    }
    
    return handleGenericError(res, err, 'user creation');
  }
});

module.exports = { usersRouter: router };