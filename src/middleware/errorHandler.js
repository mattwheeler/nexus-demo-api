'use strict';

/**
 * Global error handler middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function errorHandler(err, req, res, next) {
  // If response was already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }
  
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  // Handle specific error types
  let status = 500;
  let error = 'Internal Server Error';
  let message = 'An unexpected error occurred';
  
  // Database errors
  if (err.code) {
    switch (err.code) {
      case 'SQLITE_CONSTRAINT_UNIQUE':
        status = 409;
        error = 'Conflict';
        message = 'Resource already exists';
        break;
      case 'SQLITE_CONSTRAINT_FOREIGNKEY':
        status = 400;
        error = 'Foreign key constraint violation';
        message = 'Referenced resource does not exist';
        break;
      case 'SQLITE_CONSTRAINT':
        status = 400;
        error = 'Database constraint violation';
        message = 'Data does not meet required constraints';
        break;
      default:
        if (err.code.startsWith('SQLITE_')) {
          status = 500;
          error = 'Database Error';
          message = 'A database error occurred';
        }
        break;
    }
  }
  
  // Custom application errors
  if (err.status || err.statusCode) {
    status = err.status || err.statusCode;
    error = err.name || 'Application Error';
    message = err.message || 'An application error occurred';
  }
  
  // Validation errors
  if (err.name === 'ValidationError' || (err.details && Array.isArray(err.details))) {
    status = 422;
    error = 'Validation Error';
    message = err.message || 'Validation failed';
  }
  
  // JSON parsing errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    status = 400;
    error = 'Invalid JSON';
    message = 'Request body contains invalid JSON';
  }
  
  // Network/timeout errors
  if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
    status = 503;
    error = 'Service Unavailable';
    message = 'External service is currently unavailable';
  }
  
  // Prepare error response
  const errorResponse = {
    error,
    message
  };
  
  // Add additional details for validation errors
  if (err.details && Array.isArray(err.details)) {
    errorResponse.details = err.details.map(detail => ({
      path: detail.path?.join('.') || 'unknown',
      message: detail.message
    }));
  }
  
  // Include stack trace in development environment
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }
  
  res.status(status).json(errorResponse);
}

module.exports = { errorHandler };