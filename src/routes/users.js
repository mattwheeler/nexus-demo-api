'use strict';
const express = require('express');
const router = express.Router();
const { getUser, createUser } = require('../models/User');
const { ActivityService } = require('../services/activityService');
const { validateActivityRequest } = require('../middleware/validateActivityRequest');
const { UserNotFoundError } = require('../errors/AppError');

const activityService = new ActivityService();

/** GET /users/:id */
router.get('/:id', async (req, res, next) => {
  try {
    const user = await getUser(req.params.id);
    if (!user) {
      throw new UserNotFoundError(req.params.id);
    }
    res.json({ user });
  } catch (err) { 
    next(err); 
  }
});

/** GET /users/:id/activity */
router.get('/:id/activity', validateActivityRequest, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { cursor, limit } = req.query;
    
    const result = await activityService.getUserActivity(id, {
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined
    });
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/** POST /users */
router.post('/', async (req, res, next) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ 
        error: {
          code: 'VALIDATION_ERROR',
          message: 'name and email are required',
          timestamp: new Date().toISOString()
        }
      });
    }
    const user = await createUser({ name, email });
    res.status(201).json({ user });
  } catch (err) { 
    next(err); 
  }
});

module.exports = { usersRouter: router };