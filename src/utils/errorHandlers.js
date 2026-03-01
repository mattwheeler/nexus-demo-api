'use strict';
const { logger } = require('./logger');

/**
 * Standard error response structure
 * @typedef {Object} ErrorResponse
 * @property {string} error - Error message
 * @property {string} [code] - Error code
 * @property {Array} [details] - Additional error details
 * @property {string} [timestamp] - ISO timestamp
 */

/**
 * Custom error classes
 */
class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
    this.status = 404;
  }
}

class ValidationError extends Error {
  constructor(message = 'Validation failed', details = []) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
    this.details = details;
  }
}

class DatabaseError extends Error {
  constructor(message = 'Database operation failed', originalError = null) {
    super(message);
    this.name = 'DatabaseError';
    this.status = 500;
    this.originalError = originalError;
  }
}

class RateLimitError extends Error {
  constructor(message = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
    this.status = 429;
  }
}

/**
 * Handles user not found errors
 * @param {Object} res - Express response object
 * @param {string} [userId] - User ID that was not found
 * @param {string} [message] - Custom error message
 */
function handleUserNotFound(res, userId = null, message = null) {
  const errorMessage = message || (userId ? `User with ID ${userId} not found` : 'User not found');
  
  logger.warn('User not found', { userId, endpoint: res.req.originalUrl });
  
  return res.status(404).json({
    error: errorMessage,
    code: 'USER_NOT_FOUND',
    timestamp: new Date().toISOString()
  });
}

/**
 * Handles validation errors with detailed information
 * @param {Object} res - Express response object
 * @param {Array|string} details - Validation error details
 * @param {string} [message] - Custom error message
 */
function handleValidationError(res, details = [], message = 'Validation failed') {
  const errorDetails = Array.isArray(details) ? details : [{ message: details }];
  
  logger.warn('Validation error', { 
    details: errorDetails, 
    endpoint: res.req.originalUrl,
    body: res.req.body,
    params: res.req.params,
    query: res.req.query
  });
  
  return res.status(400).json({
    error: message,
    code: 'VALIDATION_ERROR',
    details: errorDetails,
    timestamp: new Date().toISOString()
  });
}

/**
 * Handles database errors with appropriate logging
 * @param {Object} res - Express response object
 * @param {Error} originalError - Original database error
 * @param {string} [message] - Custom error message
 */
function handleDatabaseError(res, originalError = null, message = 'Internal server error') {
  logger.error('Database error', {
    error: originalError?.message,
    stack: originalError?.stack,
    endpoint: res.req.originalUrl,
    userId: res.req.params.id || res.req.body?.userId
  });
  
  return res.status(500).json({
    error: message,
    code: 'DATABASE_ERROR',
    timestamp: new Date().toISOString()
  });
}

/**
 * Handles rate limiting errors
 * @param {Object} res - Express response object
 * @param {Object} [limitInfo] - Rate limit information
 * @param {string} [message] - Custom error message
 */
function handleRateLimitError(res, limitInfo = {}, message = 'Rate limit exceeded') {
  const { limit, remaining, resetTime } = limitInfo;
  
  logger.warn('Rate limit exceeded', {
    limit,
    remaining,
    resetTime,
    endpoint: res.req.originalUrl,
    ip: res.req.ip,
    userId: res.req.params.id
  });
  
  const response = {
    error: message,
    code: 'RATE_LIMIT_EXCEEDED',
    timestamp: new Date().toISOString()
  };
  
  // Add rate limit headers
  if (limit !== undefined) res.set('X-RateLimit-Limit', limit.toString());
  if (remaining !== undefined) res.set('X-RateLimit-Remaining', remaining.toString());
  if (resetTime !== undefined) res.set('X-RateLimit-Reset', resetTime.toString());
  
  return res.status(429).json(response);
}

/**
 * Generic error handler that determines error type and delegates to appropriate handler
 * @param {Object} res - Express response object
 * @param {Error} error - Error object
 */
function handleError(res, error) {
  if (error instanceof NotFoundError) {
    return handleUserNotFound(res, null, error.message);
  }
  
  if (error instanceof ValidationError) {
    return handleValidationError(res, error.details, error.message);
  }
  
  if (error instanceof RateLimitError) {
    return handleRateLimitError(res, {}, error.message);
  }
  
  if (error instanceof DatabaseError || error.code === 'SQLITE_ERROR') {
    return handleDatabaseError(res, error, 'Internal server error');
  }
  
  // Handle other known error types
  if (error.name === 'CastError' || error.name === 'ValidationError') {
    return handleValidationError(res, error.message);
  }
  
  // Generic server error
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    endpoint: res.req.originalUrl
  });
  
  return res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  });
}

/**
 * Async error wrapper that catches errors and delegates to error handlers
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware function
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(error => {
      handleError(res, error);
    });
  };
}

/**
 * Success response helper
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {number} [status=200] - HTTP status code
 * @param {string} [message] - Success message
 */
function sendSuccess(res, data, status = 200, message = null) {
  const response = {
    success: true,
    data,
    timestamp: new Date().toISOString()
  };
  
  if (message) {
    response.message = message;
  }
  
  return res.status(status).json(response);
}

module.exports = {
  // Error classes
  NotFoundError,
  ValidationError,
  DatabaseError,
  RateLimitError,
  
  // Error handlers
  handleUserNotFound,
  handleValidationError,
  handleDatabaseError,
  handleRateLimitError,
  handleError,
  
  // Utilities
  asyncHandler,
  sendSuccess
};