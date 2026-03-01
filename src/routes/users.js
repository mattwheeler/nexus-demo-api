'use strict';
const express = require('express');
const router = express.Router();
const { getUser, createUser } = require('../models/User');
const { getActivitiesForUser } = require('../services/activityService');
const { validatePaginationParams } = require('../middleware/validatePagination');

/** GET /users/:id */
router.get('/:id', async (req, res, next) => {
  try {
    const userId = req.params.id;
    
    // Validate user ID is a number
    if (!/^\d+$/.test(userId)) {
      return res.status(400).json({
        error: 'Invalid user ID',
        message: 'User ID must be a valid number'
      });
    }
    
    const user = await getUser(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: `User with ID ${userId} does not exist`
      });
    }
    
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

/** POST /users */
router.post('/', async (req, res, next) => {
  try {
    const { name, email } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Both name and email are required'
      });
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format',
        message: 'Please provide a valid email address'
      });
    }
    
    const user = await createUser({ name, email });
    res.status(201).json({ user });
  } catch (err) {
    // Handle unique constraint violation for email
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({
        error: 'Email already exists',
        message: 'A user with this email address already exists'
      });
    }
    next(err);
  }
});

/**
 * GET /users/:id/activity
 * Retrieve paginated activity events for a specific user
 */
router.get('/:id/activity', validatePaginationParams, async (req, res, next) => {
  try {
    const userId = req.params.id;
    
    // Validate user ID is a number
    if (!/^\d+$/.test(userId)) {
      return res.status(400).json({
        error: 'Invalid user ID',
        message: 'User ID must be a valid number'
      });
    }
    
    // Check if user exists
    const user = await getUser(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: `User with ID ${userId} does not exist`
      });
    }
    
    const { limit, cursor } = req.query;
    const result = await getActivitiesForUser(userId, { limit, cursor });
    
    res.json({
      activities: result.activities,
      pagination: {
        limit: result.limit,
        hasNext: result.hasNext,
        nextCursor: result.nextCursor
      }
    });
  } catch (err) {
    // Handle specific cursor validation errors
    if (err.name === 'InvalidCursorError') {
      return res.status(400).json({
        error: 'Invalid cursor',
        message: err.message
      });
    }
    
    next(err);
  }
});

module.exports = { usersRouter: router };