'use strict';
const express = require('express');
const router = express.Router();
const { getUser, createUser } = require('../models/User');
const ActivityService = require('../services/ActivityService');
const { validateActivityRequest, validateUserId, validateActivityQuery } = require('../middleware/activityValidation');

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

/** GET /users/:id/activity */
router.get('/:id/activity', validateUserId, validateActivityQuery, async (req, res, next) => {
  try {
    const userId = req.validatedUserId;
    const queryParams = req.validatedQuery;
    
    const result = await ActivityService.getActivities(userId, {
      limit: queryParams.limit,
      cursor: queryParams.cursor,
      eventType: queryParams.eventType
    });
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = { usersRouter: router };
