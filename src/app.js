'use strict';
const express = require('express');
const { usersRouter } = require('./routes/users');
const { activitiesRouter } = require('./routes/activities');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────
app.use('/users', usersRouter);
app.use('/activities', activitiesRouter);

// ── 404 ────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Error handler ──────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;