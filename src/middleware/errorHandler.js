'use strict';
const { AppError } = require('../errors/AppError');

/**
 * Enhanced error handler middleware with standardized error responses
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

  // Handle operational errors (our custom AppError instances)
  if (err instanceof AppError) {
    const errorResponse = {
      error: {
        message: err.message,
        code: err.code
      }
    };

    // Add issues for validation errors
    if (err.issues && err.issues.length > 0) {
      errorResponse.error.issues = err.issues;
    }

    return res.status(err.statusCode).json(errorResponse);
  }

  // Handle SQLite database errors
  if (err.code && err.code.startsWith('SQLITE_')) {
    const errorResponse = {
      error: {
        message: 'Database operation failed',
        code: 'DATABASE_ERROR'
      }
    };
    return res.status(500).json(errorResponse);
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    const errorResponse = {
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        issues: err.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message
        }))
      }
    };
    return res.status(400).json(errorResponse);
  }

  // Handle JSON parsing errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    const errorResponse = {
      error: {
        message: 'Invalid JSON in request body',
        code: 'INVALID_JSON'
      }
    };
    return res.status(400).json(errorResponse);
  }

  // Log unexpected errors in production
  if (process.env.NODE_ENV === 'production') {
    console.error('Unexpected error:', err);
  }

  // Handle all other errors as internal server errors
  const errorResponse = {
    error: {
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal Server Error' 
        : err.message || 'Internal Server Error',
      code: 'INTERNAL_ERROR'
    }
  };

  res.status(500).json(errorResponse);
}

module.exports = { errorHandler };