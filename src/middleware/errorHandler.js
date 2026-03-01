'use strict';

/**
 * Error handler middleware for Express applications
 * Handles errors and sends appropriate JSON responses
 * @param {Error} err - The error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function errorHandler(err, req, res, next) {
  // Don't handle if response has already been sent
  if (res.headersSent) {
    return next(err);
  }

  // Get status code from error object or default to 500
  const statusCode = err.statusCode || err.status || 500;
  
  // Get error message or use default
  const message = err.message || 'Internal Server Error';

  // Log error for debugging (only in development)
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error caught by errorHandler:', {
      message: err.message,
      stack: err.stack,
      statusCode
    });
  }

  // Send JSON error response
  res.status(statusCode).json({
    error: message
  });
}

module.exports = { errorHandler };