'use strict';
const express = require('express');
const router = express.Router();
const { getUser, createUser } = require('../models/User');
const { validateUserActivity } = require('../middleware/validateUserActivity');
const { getActivityService } = require('../services/activityService');

/** GET /users/:id */
router.get('/:id', async (req, res, next) => {
  try {
    const user = await getUser(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) { next(err); }
});

/** GET /users/:id/activity */
router.get('/:id/activity', validateUserActivity, async (req, res, next) => {
  try {
    const userId = req.params.id;
    const { limit, cursor } = req.query;
    
    // Check if user exists first
    const user = await getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const activityService = getActivityService();
    const result = await activityService.getUserActivity(userId, { limit, cursor });
    
    res.json(result);
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