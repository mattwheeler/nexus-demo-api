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
  
  // Send error response
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    type: 'SERVER_ERROR',
    timestamp: new Date().toISOString()
  });
}

module.exports = { errorHandler };