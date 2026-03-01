'use strict';
const express = require('express');
const router = express.Router();
const { getUser, createUser } = require('../models/User');
const { activityService } = require('../services/activityService');
const { validateRequest } = require('../middleware/validateRequest');
const { activityQuerySchema } = require('../types/activity');

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
    
    // Create user creation activity
    await activityService.createActivity({
      userId: user.id.toString(),
      type: 'user_created',
      description: `User ${user.name} was created`,
      metadata: { email: user.email }
    });
    
    res.status(201).json({ user });
  } catch (err) { next(err); }
});

/** GET /users/:id/activities */
router.get('/:id/activities', validateRequest(activityQuerySchema), async (req, res, next) => {
  try {
    const user = await getUser(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const activities = await activityService.getActivities({
      userId: req.params.id,
      ...req.body
    });
    
    res.json(activities);
  } catch (err) {
    next(err);
  }
});

module.exports = { usersRouter: router };