'use strict';
const express = require('express');
const router = express.Router();
const { getUser, createUser } = require('../models/User');
const { validateUserActivity } = require('../middleware/validateUserActivity');

/** GET /users/:id */
router.get('/:id', async (req, res, next) => {
  try {
    const user = await getUser(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) { next(err); }
});

/** GET /users/:user_id/activity */
router.get('/:user_id/activity', validateUserActivity, async (req, res, next) => {
  try {
    const { user_id } = req.params;
    const { limit, offset } = req.query;
    
    // For now, return a placeholder response with validated parameters
    // This endpoint will be implemented with actual activity logic later
    res.json({
      user_id,
      limit,
      offset,
      activities: [],
      message: 'Activity endpoint - validation successful'
    });
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

module.exports = { usersRouter: router };