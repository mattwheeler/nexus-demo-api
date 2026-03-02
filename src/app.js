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
    type: 'NOT_FOUND_ERROR',
    timestamp: new Date().toISOString()
  });
});

// ── Global error handler ──────────────────────────────────────────
app.use(errorHandler);

module.exports = app;