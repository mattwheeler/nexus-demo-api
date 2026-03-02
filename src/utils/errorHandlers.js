'use strict';

/**
 * Standard error response format
 * @typedef {Object} ErrorResponse
 * @property {string} error - Error message
 * @property {string} code - Error code
 * @property {number} timestamp - Unix timestamp
 * @property {Object} [details] - Additional error details
 */

/**
 * Creates a standardized error response object
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @param {Object} [details] - Additional error details
 * @returns {ErrorResponse} Standardized error response
 */
function createErrorResponse(message, code, details = null) {
  const errorResponse = {
    error: message,
    code,
    timestamp: Date.now()
  };
  
  if (details) {
    errorResponse.details = details;
  }
  
  return errorResponse;
}

/**
 * Handles user not found errors (404)
 * @param {Object} res - Express response object
 * @param {number} userId - User ID that was not found
 * @returns {Object} Express response
 */
function handleUserNotFound(res, userId) {
  const errorResponse = createErrorResponse(
    'User not found',
    'USER_NOT_FOUND',
    { userId }
  );
  
  return res.status(404).json(errorResponse);
}

/**
 * Handles database errors (500)
 * @param {Object} res - Express response object
 * @param {Error} error - Database error object
 * @param {string} [operation] - Database operation that failed
 * @returns {Object} Express response
 */
function handleDatabaseError(res, error, operation = 'database operation') {
  const errorResponse = createErrorResponse(
    'Internal server error occurred',
    'DATABASE_ERROR',
    {
      operation,
      // Only include error details in development
      ...(process.env.NODE_ENV === 'development' && {
        originalError: error.message
      })
    }
  );
  
  // Log the full error for debugging
  console.error(`Database error during ${operation}:`, error);
  
  return res.status(500).json(errorResponse);
}

/**
 * Handles validation errors (400)
 * @param {Object} res - Express response object
 * @param {string} message - Validation error message
 * @param {Array<Object>} [validationErrors] - Array of field-specific validation errors
 * @returns {Object} Express response
 */
function handleValidationError(res, message, validationErrors = null) {
  const errorResponse = createErrorResponse(
    message,
    'VALIDATION_ERROR',
    validationErrors ? { fields: validationErrors } : null
  );
  
  return res.status(400).json(errorResponse);
}

/**
 * Generic error handler that determines the appropriate response based on error type
 * @param {Object} res - Express response object
 * @param {Error} error - Error object
 * @param {string} [context] - Context where the error occurred
 * @returns {Object} Express response
 */
function handleGenericError(res, error, context = 'operation') {
  // Check if it's a known error type
  if (error.code === 'USER_NOT_FOUND') {
    return handleUserNotFound(res, error.userId);
  }
  
  if (error.code === 'VALIDATION_ERROR') {
    return handleValidationError(res, error.message, error.validationErrors);
  }
  
  // Check if it's a database-related error
  if (error.code && (error.code.startsWith('SQLITE_') || error.code.includes('DATABASE'))) {
    return handleDatabaseError(res, error, context);
  }
  
  // Default to internal server error
  return handleDatabaseError(res, error, context);
}

/**
 * Custom error classes for consistent error handling
 */
class UserNotFoundError extends Error {
  constructor(userId) {
    super('User not found');
    this.name = 'UserNotFoundError';
    this.code = 'USER_NOT_FOUND';
    this.userId = userId;
  }
}

class ValidationError extends Error {
  constructor(message, validationErrors = null) {
    super(message);
    this.name = 'ValidationError';
    this.code = 'VALIDATION_ERROR';
    this.validationErrors = validationErrors;
  }
}

class DatabaseError extends Error {
  constructor(message, operation = 'database operation') {
    super(message);
    this.name = 'DatabaseError';
    this.code = 'DATABASE_ERROR';
    this.operation = operation;
  }
}

module.exports = {
  createErrorResponse,
  handleUserNotFound,
  handleDatabaseError,
  handleValidationError,
  handleGenericError,
  UserNotFoundError,
  ValidationError,
  DatabaseError
};