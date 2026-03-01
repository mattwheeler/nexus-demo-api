'use strict';

/**
 * Base application error class
 */
class AppError extends Error {
  /**
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {string} code - Error code for consistent client handling
   * @param {boolean} isOperational - Whether error is operational (expected)
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * User not found error
 */
class UserNotFoundError extends AppError {
  constructor(userId) {
    super(`User with ID ${userId} not found`, 404, 'USER_NOT_FOUND');
  }
}

/**
 * Invalid cursor error for pagination
 */
class InvalidCursorError extends AppError {
  constructor(cursor) {
    super(`Invalid pagination cursor: ${cursor}`, 400, 'INVALID_CURSOR');
  }
}

/**
 * Database error
 */
class DatabaseError extends AppError {
  constructor(message, originalError = null) {
    super(`Database operation failed: ${message}`, 500, 'DATABASE_ERROR');
    this.originalError = originalError;
  }
}

/**
 * Validation error
 */
class ValidationError extends AppError {
  constructor(message, issues = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.issues = issues;
  }
}

module.exports = {
  AppError,
  UserNotFoundError,
  InvalidCursorError,
  DatabaseError,
  ValidationError
};