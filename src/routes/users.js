'use strict';
const express = require('express');
const router = express.Router();
const { getUser, createUser } = require('../models/User');
const { getActivityEvents } = require('../services/ActivityService');
const { validateActivityQuery } = require('../middleware/validateActivityQuery');

/** GET /users/:id */
router.get('/:id', async (req, res, next) => {
  try {
    const user = await getUser(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) { next(err); }
});

/** GET /users/:id/activity */
router.get('/:id/activity', validateActivityQuery, async (req, res, next) => {
  try {
    const userId = req.validatedUserId;
    const { limit = 20, cursor, type } = req.query;
    
    // Check if user exists
    const user = await getUser(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        type: 'NOT_FOUND_ERROR',
        timestamp: new Date().toISOString()
      });
    }
    
    const result = await getActivityEvents(userId, { limit, cursor, type });
    
    res.json({
      success: true,
      data: result.events,
      pagination: {
        hasNext: result.hasNext,
        nextCursor: result.nextCursor,
        limit: limit
      },
      timestamp: new Date().toISOString()
    });
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