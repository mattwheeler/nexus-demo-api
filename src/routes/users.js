'use strict';
const express = require('express');
const router = express.Router();
const { getUser, createUser } = require('../models/User');
const { validateUserId, validateUserActivity } = require('../middleware/validateParams');

/** GET /users/:id */
router.get('/:id', validateUserId(), async (req, res, next) => {
  try {
    const user = await getUser(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) { next(err); }
});

/** GET /users/:id/activity */
router.get('/:id/activity', validateUserActivity(), async (req, res, next) => {
  try {
    // TODO: Implement user activity retrieval logic
    // For now, return a placeholder response
    res.json({ 
      activities: [],
      user_id: req.params.id,
      cursor: req.query.cursor || null
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