'use strict';
const express = require('express');
const router = express.Router();
const { getUser, createUser } = require('../models/User');
const { validateUserActivityRequest } = require('../middleware/userActivityValidation');

/** GET /users/:id */
router.get('/:id', async (req, res, next) => {
  try {
    const user = await getUser(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) { next(err); }
});

/** GET /users/:id/activity - User activity endpoint with validation */
router.get('/:id/activity', validateUserActivityRequest, async (req, res, next) => {
  try {
    // At this point, req.params.id is validated as integer
    // and req.query.limit and req.query.cursor are validated
    const { id } = req.params;
    const { limit, cursor } = req.query;
    
    // TODO: Implement actual activity fetching logic
    // This is a placeholder response structure
    res.json({
      user_id: id,
      activities: [],
      pagination: {
        limit,
        cursor: cursor || null,
        has_more: false
      }
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