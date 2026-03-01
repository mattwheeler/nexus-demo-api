'use strict';
const { logger } = require('../utils/logger');

/**
 * Enhanced error handler middleware with consistent error response format
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
function errorHandler(err, req, res, next) {
  // If response already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }
  
  // Default values
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let code = err.code || 'INTERNAL_ERROR';
  let details = err.details || null;
  
  // Handle specific error types
  switch (err.name) {
    case 'ValidationError':
      status = 400;
      code = 'VALIDATION_ERROR';
      break;
      
    case 'NotFoundError':
      status = 404;
      code = 'NOT_FOUND';
      break;
      
    case 'DatabaseError':
      status = 500;
      code = 'DATABASE_ERROR';
      message = 'Internal server error'; // Don't expose database details
      break;
      
    case 'RateLimitError':
      status = 429;
      code = 'RATE_LIMIT_EXCEEDED';
      break;
      
    case 'CastError':
      status = 400;
      code = 'INVALID_INPUT';
      message = 'Invalid input format';
      break;
      
    case 'JsonWebTokenError':
      status = 401;
      code = 'INVALID_TOKEN';
      message = 'Invalid authentication token';
      break;
      
    case 'TokenExpiredError':
      status = 401;
      code = 'TOKEN_EXPIRED';
      message = 'Authentication token has expired';
      break;
  }
  
  // Log error with context
  const logContext = {
    error: err.message,
    stack: err.stack,
    status,
    code,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.params?.id || req.body?.userId
  };
  
  if (status >= 500) {
    logger.error('Server error', logContext);
  } else if (status >= 400) {
    logger.warn('Client error', logContext);
  }
  
  // Construct error response
  const errorResponse = {
    error: message,
    code,
    timestamp: new Date().toISOString()
  };
  
  // Add details if available (for validation errors)
  if (details && Array.isArray(details) && details.length > 0) {
    errorResponse.details = details;
  }
  
  // Add request ID if available
  if (req.id) {
    errorResponse.requestId = req.id;
  }
  
  res.status(status).json(errorResponse);
}

module.exports = { errorHandler };