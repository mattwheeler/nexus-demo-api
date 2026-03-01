'use strict';
const express = require('express');
const { usersRouter } = require('./routes/users');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────
app.use('/users', usersRouter);

// ── 404 ────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ 
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
      timestamp: new Date().toISOString()
    }
  });
});

// ── Error handler ──────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;