'use strict';
const express = require('express');
const { usersRouter } = require('./routes/users');
const { activityRouter } = require('./routes/activity');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────
app.use('/users', usersRouter);
app.use('/users', activityRouter);

// ── 404 ────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    code: 'NOT_FOUND'
  });
});

// ── Error handler ──────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;