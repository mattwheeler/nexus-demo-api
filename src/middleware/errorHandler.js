'use strict';
const { AppError } = require('../errors/AppError');

/**
 * Enhanced error handler middleware with consistent error response format
 * @param {Error} err - The error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function errorHandler(err, req, res, next) {
  // Don't handle if response already sent
  if (res.headersSent) {
    return next(err);
  }

  // Default error properties
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Internal Server Error';
  let issues = undefined;
  let stack = undefined;

  // Handle operational errors (AppError and subclasses)
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    
    // Include validation issues if present
    if (err.issues) {
      issues = err.issues;
    }
  }
  // Handle known Express/HTTP errors
  else if (err.status || err.statusCode) {
    statusCode = err.status || err.statusCode;
    message = err.message || 'Bad Request';
    code = getErrorCodeFromStatus(statusCode);
  }
  // Handle SQLite/Database errors
  else if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    statusCode = 409;
    code = 'DUPLICATE_ENTRY';
    message = 'Resource already exists';
  }
  else if (err.code && err.code.startsWith('SQLITE_')) {
    statusCode = 500;
    code = 'DATABASE_ERROR';
    message = 'Database operation failed';
  }

  // Include stack trace in development
  if (process.env.NODE_ENV !== 'production') {
    stack = err.stack;
  }

  // Log error for monitoring (in production, you'd use a proper logger)
  console.error(`[${new Date().toISOString()}] ${statusCode} ${code}: ${message}`);
  if (err.stack) {
    console.error(err.stack);
  }

  // Construct consistent error response
  const errorResponse = {
    error: {
      code,
      message,
      timestamp: new Date().toISOString()
    }
  };

  // Add optional fields
  if (issues) {
    errorResponse.error.issues = issues;
  }
  if (stack) {
    errorResponse.error.stack = stack;
  }

  res.status(statusCode).json(errorResponse);
}

/**
 * Get error code from HTTP status code
 * @param {number} statusCode - HTTP status code
 * @returns {string} Error code
 */
function getErrorCodeFromStatus(statusCode) {
  const statusToCode = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'VALIDATION_ERROR',
    429: 'RATE_LIMIT_EXCEEDED',
    500: 'INTERNAL_ERROR',
    502: 'BAD_GATEWAY',
    503: 'SERVICE_UNAVAILABLE'
  };
  return statusToCode[statusCode] || 'UNKNOWN_ERROR';
}

module.exports = { errorHandler };