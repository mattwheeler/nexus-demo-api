'use strict';

/**
 * Custom error classes for different error types
 */
class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, issues = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.issues = issues;
  }
}

class NotFoundError extends AppError {
  constructor(message) {
    super(message, 404, 'NOT_FOUND');
  }
}

class DatabaseError extends AppError {
  constructor(message) {
    super(message, 500, 'DATABASE_ERROR');
  }
}

/**
 * Enhanced error handler middleware
 * @param {Error} err - The error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function errorHandler(err, req, res, next) {
  // If response already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  // Set default values
  let statusCode = 500;
  let errorResponse = {
    error: 'Internal Server Error',
    code: 'INTERNAL_ERROR'
  };

  // Handle operational errors
  if (err.isOperational) {
    statusCode = err.statusCode;
    errorResponse = {
      error: err.message,
      code: err.code
    };

    // Add issues for validation errors
    if (err instanceof ValidationError && err.issues.length > 0) {
      errorResponse.issues = err.issues;
    }
  }
  // Handle SQLite/Database errors
  else if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    statusCode = 400;
    errorResponse = {
      error: 'Invalid user reference',
      code: 'INVALID_USER_ID'
    };
  }
  else if (err.code && err.code.startsWith('SQLITE_')) {
    statusCode = 500;
    errorResponse = {
      error: 'Database error',
      code: 'DATABASE_ERROR'
    };
  }
  // Handle validation errors from zod or other validators
  else if (err.name === 'ValidationError' || (err.issues && Array.isArray(err.issues))) {
    statusCode = 400;
    errorResponse = {
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      issues: err.issues || []
    };
  }
  // Handle syntax errors (malformed JSON, etc.)
  else if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    errorResponse = {
      error: 'Invalid JSON format',
      code: 'INVALID_JSON'
    };
  }

  // Log error for debugging (in production, use proper logging)
  if (statusCode >= 500) {
    console.error('Server Error:', {
      message: err.message,
      stack: err.stack,
      code: err.code
    });
  }

  res.status(statusCode).json(errorResponse);
}

/**
 * Async error wrapper to catch async errors in route handlers
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware function
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  errorHandler,
  asyncHandler,
  AppError,
  ValidationError,
  NotFoundError,
  DatabaseError
};