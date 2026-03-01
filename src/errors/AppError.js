'use strict';

/**
 * Base application error class with consistent structure
 */
class AppError extends Error {
  /**
   * Create an application error
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {string} code - Error code identifier
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.status = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * User not found error (404)
 */
class UserNotFoundError extends AppError {
  constructor(userId) {
    super(`User with ID ${userId} not found`, 404, 'USER_NOT_FOUND');
  }
}

/**
 * Invalid pagination parameters error (400)
 */
class InvalidPaginationError extends AppError {
  constructor(message = 'Invalid pagination parameters') {
    super(message, 400, 'INVALID_PAGINATION');
  }
}

/**
 * Invalid cursor error (400)
 */
class InvalidCursorError extends AppError {
  constructor(message = 'Invalid cursor provided') {
    super(message, 400, 'INVALID_CURSOR');
  }
}

/**
 * Database connection error (500)
 */
class DatabaseError extends AppError {
  constructor(message = 'Database connection failed') {
    super(message, 500, 'DATABASE_ERROR');
  }
}

/**
 * Validation error (400)
 */
class ValidationError extends AppError {
  constructor(message = 'Validation failed', issues = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.issues = issues;
  }
}

/**
 * Resource not found error (404)
 */
class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

/**
 * Bad request error (400)
 */
class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(message, 400, 'BAD_REQUEST');
  }
}

module.exports = {
  AppError,
  UserNotFoundError,
  InvalidPaginationError,
  InvalidCursorError,
  DatabaseError,
  ValidationError,
  NotFoundError,
  BadRequestError
};