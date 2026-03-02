'use strict';
const express = require('express');
const router = express.Router();
const { getUser, createUser } = require('../models/User');
const { getActivity } = require('../services/activityService');
const { validateActivityQuery } = require('../middleware/validateActivityQuery');
const { activityErrorHandler, asyncErrorHandler } = require('../middleware/activityErrorHandler');

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
router.get('/:id/activity', 
  validateActivityQuery,
  asyncErrorHandler(async (req, res, next) => {
    const userId = parseInt(req.params.id, 10);
    const { limit, cursor, type } = req.query;
    
    const result = await getActivity(userId, {
      limit: limit ? parseInt(limit, 10) : 50,
      cursor,
      type
    });
    
    res.json(result);
  }),
  activityErrorHandler
);

module.exports = { usersRouter: router };