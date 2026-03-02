'use strict';
const { ZodError } = require('zod');

/**
 * Logger utility for activity errors
 */
class ActivityLogger {
  static log(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...meta
    };
    
    // In production, this would integrate with a proper logging service
    // For now, we'll use console with structured logging
    if (level === 'error') {
      console.error(`[${timestamp}] ERROR:`, message, meta);
    } else if (level === 'warn') {
      console.warn(`[${timestamp}] WARN:`, message, meta);
    } else {
      console.log(`[${timestamp}] ${level.toUpperCase()}:`, message, meta);
    }
  }
  
  static error(message, meta = {}) {
    this.log('error', message, meta);
  }
  
  static warn(message, meta = {}) {
    this.log('warn', message, meta);
  }
  
  static info(message, meta = {}) {
    this.log('info', message, meta);
  }
}

/**
 * Standard error response formatter for activity endpoints
 */
class ActivityErrorResponse {
  /**
   * Create a standardized error response
   * @param {string} error - Main error message
   * @param {Array} [details=[]] - Array of detailed error information
   * @param {string} [type='ACTIVITY_ERROR'] - Error type for client categorization
   * @param {Object} [metadata={}] - Additional metadata
   * @returns {Object} Formatted error response
   */
  static create(error, details = [], type = 'ACTIVITY_ERROR', metadata = {}) {
    return {
      error,
      type,
      details,
      timestamp: new Date().toISOString(),
      ...metadata
    };
  }
  
  /**
   * Create validation error response
   * @param {Array} validationErrors - Array of validation error details
   * @returns {Object} Formatted validation error response
   */
  static validation(validationErrors) {
    return this.create(
      'Validation failed',
      validationErrors,
      'VALIDATION_ERROR'
    );
  }
  
  /**
   * Create not found error response
   * @param {string} resource - Resource that was not found
   * @param {string|number} identifier - Resource identifier
   * @returns {Object} Formatted not found error response
   */
  static notFound(resource, identifier) {
    return this.create(
      `${resource} not found`,
      [{
        path: resource.toLowerCase(),
        message: `${resource} with identifier '${identifier}' does not exist`
      }],
      'NOT_FOUND_ERROR',
      { resource, identifier }
    );
  }
  
  /**
   * Create database error response
   * @param {string} operation - Database operation that failed
   * @returns {Object} Formatted database error response
   */
  static database(operation) {
    return this.create(
      'Database operation failed',
      [{
        path: 'database',
        message: `Failed to ${operation}. Please try again later.`
      }],
      'DATABASE_ERROR',
      { operation }
    );
  }
  
  /**
   * Create internal server error response
   * @param {string} [message='An unexpected error occurred'] - Error message
   * @returns {Object} Formatted internal server error response
   */
  static internal(message = 'An unexpected error occurred') {
    return this.create(
      message,
      [{
        path: 'server',
        message: 'An internal server error occurred. Please try again later.'
      }],
      'INTERNAL_SERVER_ERROR'
    );
  }
}

/**
 * Comprehensive error handler specifically for activity endpoints
 * Handles validation errors, database errors, not found errors, and other edge cases
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function activityErrorHandler(err, req, res, next) {
  // Skip if response already sent
  if (res.headersSent) {
    return next(err);
  }
  
  // Extract request context for logging
  const requestContext = {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.validatedUserId || req.params.userId,
    query: req.query,
    timestamp: new Date().toISOString()
  };
  
  // Handle Zod validation errors
  if (err instanceof ZodError || err.name === 'ZodError') {
    ActivityLogger.warn('Activity validation error', {
      ...requestContext,
      validationIssues: err.issues || err.errors
    });
    
    const validationDetails = (err.issues || err.errors || []).map(issue => ({
      path: Array.isArray(issue.path) ? issue.path.join('.') : issue.path || 'unknown',
      message: issue.message || 'Invalid value'
    }));
    
    return res.status(400).json(ActivityErrorResponse.validation(validationDetails));
  }
  
  // Handle validation errors from middleware (custom validation errors)
  if (err.message === 'Validation failed' && err.details) {
    ActivityLogger.warn('Activity middleware validation error', {
      ...requestContext,
      validationDetails: err.details
    });
    
    return res.status(400).json(ActivityErrorResponse.validation(err.details));
  }
  
  // Handle user not found errors (404)
  if (err.status === 404 || err.message.includes('not found') || err.message.includes('User with ID')) {
    ActivityLogger.info('Activity resource not found', {
      ...requestContext,
      error: err.message
    });
    
    // Extract user ID from error message if available
    const userIdMatch = err.message.match(/User with ID (\d+)/);
    const userId = userIdMatch ? userIdMatch[1] : req.params.userId;
    
    return res.status(404).json(ActivityErrorResponse.notFound('User', userId));
  }
  
  // Handle database connection and operation errors (500)
  if (err.code === 'SQLITE_CANTOPEN' || 
      err.code === 'SQLITE_BUSY' ||
      err.code === 'SQLITE_LOCKED' ||
      err.message.includes('database') ||
      err.message.includes('SQLITE')) {
    
    ActivityLogger.error('Activity database error', {
      ...requestContext,
      error: err.message,
      code: err.code,
      stack: err.stack
    });
    
    const operation = req.method === 'GET' ? 'retrieve activity data' : 'process activity request';
    return res.status(500).json(ActivityErrorResponse.database(operation));
  }
  
  // Handle foreign key constraint errors (400)
  if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY' || 
      err.message.includes('FOREIGN KEY constraint failed')) {
    
    ActivityLogger.warn('Activity foreign key constraint error', {
      ...requestContext,
      error: err.message,
      code: err.code
    });
    
    return res.status(400).json(ActivityErrorResponse.create(
      'Invalid user reference',
      [{
        path: 'userId',
        message: 'The specified user does not exist'
      }],
      'CONSTRAINT_ERROR'
    ));
  }
  
  // Handle rate limiting or resource exhaustion (429 or 503)
  if (err.code === 'SQLITE_BUSY' || err.message.includes('too many')) {
    ActivityLogger.warn('Activity service unavailable', {
      ...requestContext,
      error: err.message,
      code: err.code
    });
    
    return res.status(503).json(ActivityErrorResponse.create(
      'Service temporarily unavailable',
      [{
        path: 'service',
        message: 'The activity service is temporarily unavailable. Please try again later.'
      }],
      'SERVICE_UNAVAILABLE_ERROR'
    ));
  }
  
  // Handle service-level errors with predefined status codes
  if (err.status && err.status >= 400 && err.status < 500) {
    ActivityLogger.warn('Activity client error', {
      ...requestContext,
      status: err.status,
      error: err.message
    });
    
    return res.status(err.status).json(ActivityErrorResponse.create(
      err.message,
      [{
        path: 'request',
        message: err.message
      }],
      'CLIENT_ERROR'
    ));
  }
  
  // Handle unexpected service errors (500)
  if (err.status === 500 || err.originalError) {
    ActivityLogger.error('Activity service error', {
      ...requestContext,
      error: err.message,
      originalError: err.originalError ? {
        message: err.originalError.message,
        stack: err.originalError.stack
      } : undefined,
      stack: err.stack
    });
    
    return res.status(500).json(ActivityErrorResponse.internal('Failed to process activity request'));
  }
  
  // Handle any other unexpected errors (500)
  ActivityLogger.error('Unexpected activity error', {
    ...requestContext,
    error: err.message,
    stack: err.stack,
    name: err.name,
    code: err.code
  });
  
  return res.status(500).json(ActivityErrorResponse.internal());
}

/**
 * Async wrapper for activity route handlers to ensure errors are caught and passed to error handler
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped route handler that catches async errors
 */
function asyncErrorHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Activity request logging middleware for debugging
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function activityRequestLogger(req, res, next) {
  const startTime = Date.now();
  
  // Log incoming request
  ActivityLogger.info('Activity request received', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.params.userId,
    query: req.query
  });
  
  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - startTime;
    
    ActivityLogger.info('Activity request completed', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userId: req.params.userId
    });
    
    return originalJson.call(this, data);
  };
  
  next();
}

module.exports = {
  activityErrorHandler,
  asyncErrorHandler,
  activityRequestLogger,
  ActivityErrorResponse,
  ActivityLogger
};