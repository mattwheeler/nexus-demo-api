'use strict';
const express = require('express');
const { usersRouter } = require('./routes/users');
const { errorHandler } = require('./middleware/errorHandler');
const { NotFoundError } = require('./errors/AppError');

const app = express();

app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────
app.use('/users', usersRouter);

// ── 404 handler with standardized error response ──────────────────
app.use((req, res, next) => {
  next(new NotFoundError('Endpoint'));
});

// ── Enhanced error handler ─────────────────────────────────────────
app.use(errorHandler);

module.exports = app;