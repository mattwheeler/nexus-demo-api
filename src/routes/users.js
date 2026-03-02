'use strict';
const express = require('express');
const router = express.Router();
const { getUser, createUser } = require('../models/User');
const { validateUserActivity } = require('../middleware/validateUserActivity');
const { getUserActivities } = require('../services/userActivityService');
const { formatActivityResponse } = require('../utils/formatActivityResponse');
const { handleUserNotFound, handleGenericError } = require('../utils/errorHandlers');

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

/** GET /users/:user_id/activity */
router.get('/:user_id/activity', validateUserActivity, async (req, res, next) => {
  try {
    const userId = req.params.user_id;
    const { limit, offset } = req.query;
    
    // Check if user exists
    const user = await getUser(userId);
    if (!user) {
      return handleUserNotFound(res, userId);
    }
    
    // Get user activities
    const data = await getUserActivities(userId, { limit, offset });
    
    // Format and return response
    const formattedResponse = formatActivityResponse(data, { limit, offset });
    res.json(formattedResponse);
    
  } catch (error) {
    return handleGenericError(res, error, 'retrieving user activities');
  }
});

module.exports = { usersRouter: router };