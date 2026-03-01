'use strict';
const express = require('express');
const router = express.Router();
const { getUser, createUser } = require('../models/User');
const { getActivityByUserId } = require('../services/activityService');
const { validateActivityParams } = require('../middleware/inputValidation');

/** GET /users/:id */
router.get('/:id', async (req, res, next) => {
  try {
    const user = await getUser(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) { next(err); }
});

/** GET /users/:id/activity */
router.get('/:id/activity', validateActivityParams, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { cursor, limit } = req.query;
    
    // Check if user exists first
    const user = await getUser(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const activities = await getActivityByUserId(id, { cursor, limit });
    res.json({ activities });
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