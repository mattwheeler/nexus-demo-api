'use strict';

/**
 * Global error handler for all endpoints
 * This is the fallback error handler that catches any errors not handled by specific middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function errorHandler(err, req, res, next) {
  // Skip if response already sent
  if (res.headersSent) {
    return next(err);
  }
  
  // Log error for debugging
  console.error('Global error handler:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  // Determine status code
  const status = err.status || err.statusCode || 500;
  
  // Create consistent error response format
  const errorResponse = {
    error: err.message || 'Internal Server Error',
    type: 'GENERAL_ERROR',
    timestamp: new Date().toISOString()
  };
  
  // Add additional details for development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }
  
  return res.status(status).json(errorResponse);
}

module.exports = { errorHandler };