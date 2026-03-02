'use strict';

/**
 * Error types for user activity operations
 */
const ERROR_TYPES = {
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  DATABASE_ERROR: 'DATABASE_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR'
};

/**
 * Status codes for different error types
 */
const ERROR_STATUS_CODES = {
  [ERROR_TYPES.USER_NOT_FOUND]: 404,
  [ERROR_TYPES.DATABASE_ERROR]: 500,
  [ERROR_TYPES.VALIDATION_ERROR]: 400
};

/**
 * Creates a standardized error object for user activity operations
 * @param {string} type - Error type from ERROR_TYPES
 * @param {string} message - Error message
 * @param {Object} [details] - Additional error details
 * @returns {Error} Standardized error object
 */
function createUserActivityError(type, message, details = null) {
  const error = new Error(message);
  error.type = type;
  error.statusCode = ERROR_STATUS_CODES[type] || 500;
  
  if (details) {
    error.details = details;
  }
  
  return error;
}

/**
 * Creates a user not found error
 * @param {number} userId - The user ID that was not found
 * @returns {Error} User not found error
 */
function createUserNotFoundError(userId) {
  return createUserActivityError(
    ERROR_TYPES.USER_NOT_FOUND,
    `User with ID ${userId} not found`,
    { userId }
  );
}

/**
 * Creates a database error
 * @param {string} operation - The database operation that failed
 * @param {Error} [originalError] - The original database error
 * @returns {Error} Database error
 */
function createDatabaseError(operation, originalError = null) {
  const details = { operation };
  if (originalError && process.env.NODE_ENV === 'development') {
    details.originalError = originalError.message;
  }
  
  return createUserActivityError(
    ERROR_TYPES.DATABASE_ERROR,
    `Database error during ${operation}`,
    details
  );
}

/**
 * Creates a validation error
 * @param {string} message - Validation error message
 * @param {Array} [validationErrors] - Array of field-specific validation errors
 * @returns {Error} Validation error
 */
function createValidationError(message, validationErrors = null) {
  const details = validationErrors ? { fields: validationErrors } : null;
  
  return createUserActivityError(
    ERROR_TYPES.VALIDATION_ERROR,
    message,
    details
  );
}

module.exports = {
  ERROR_TYPES,
  ERROR_STATUS_CODES,
  createUserActivityError,
  createUserNotFoundError,
  createDatabaseError,
  createValidationError
};