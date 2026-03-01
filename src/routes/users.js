'use strict';
const express = require('express');
const router = express.Router();
const { getUser, createUser, getUserActivities } = require('../models/User');
const { validateRequest } = require('../middleware/validateRequest');
const { ensureUserExists, validateRequiredFields, validatePaginationParams } = require('../utils/errorHelpers');
const { UserNotFoundError, BadRequestError } = require('../errors/AppError');

/** GET /users/:id */
router.get('/:id', async (req, res, next) => {
  try {
    const userId = req.params.id;
    
    // Validate user ID format
    if (!userId || isNaN(parseInt(userId, 10))) {
      throw new BadRequestError('Invalid user ID format');
    }
    
    const user = await getUser(userId);
    ensureUserExists(user, userId);
    
    res.json({ user });
  } catch (err) { 
    next(err); 
  }
});

/** GET /users/:id/activity */
router.get('/:id/activity', async (req, res, next) => {
  try {
    const userId = req.params.id;
    
    // Validate user ID format
    if (!userId || isNaN(parseInt(userId, 10))) {
      throw new BadRequestError('Invalid user ID format');
    }
    
    // First check if user exists
    const user = await getUser(userId);
    ensureUserExists(user, userId);
    
    // Validate pagination parameters
    const { limit, cursor, offset } = req.query;
    validatePaginationParams({ limit, cursor, offset });
    
    // Get user activities with validated parameters
    const activities = await getUserActivities(userId, {
      limit: limit ? parseInt(limit, 10) : 10,
      cursor,
      offset: offset ? parseInt(offset, 10) : 0
    });
    
    res.json({ activities });
  } catch (err) {
    next(err);
  }
});

/** POST /users */
router.post('/', async (req, res, next) => {
  try {
    // Validate required fields
    validateRequiredFields(req.body, ['name', 'email']);
    
    const { name, email } = req.body;
    const user = await createUser({ name, email });
    
    res.status(201).json({ user });
  } catch (err) { 
    next(err); 
  }
});

module.exports = { usersRouter: router };