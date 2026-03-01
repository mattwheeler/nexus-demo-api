'use strict';
const {
  UserNotFoundError,
  InvalidPaginationError,
  InvalidCursorError,
  DatabaseError,
  ValidationError,
  BadRequestError
} = require('../errors/AppError');

/**
 * Validate pagination parameters and throw appropriate errors
 * @param {Object} params - Pagination parameters
 * @param {number} params.limit - Results limit
 * @param {string} params.cursor - Pagination cursor
 * @param {number} params.offset - Results offset
 */
function validatePaginationParams({ limit, cursor, offset }) {
  // Validate limit
  if (limit !== undefined) {
    const numLimit = parseInt(limit, 10);
    if (isNaN(numLimit) || numLimit < 1 || numLimit > 100) {
      throw new InvalidPaginationError('Limit must be a number between 1 and 100');
    }
  }

  // Validate offset
  if (offset !== undefined) {
    const numOffset = parseInt(offset, 10);
    if (isNaN(numOffset) || numOffset < 0) {
      throw new InvalidPaginationError('Offset must be a non-negative number');
    }
  }

  // Validate cursor format if provided
  if (cursor !== undefined && cursor !== null) {
    try {
      // Assume cursor is base64 encoded JSON
      const decoded = Buffer.from(cursor, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      
      // Basic cursor structure validation
      if (!parsed.id || !parsed.created_at) {
        throw new InvalidCursorError('Invalid cursor format');
      }
    } catch (error) {
      throw new InvalidCursorError('Invalid cursor encoding');
    }
  }
}

/**
 * Wrap database operations to catch and convert database errors
 * @param {Function} dbOperation - Database operation function
 * @returns {Promise} - Promise that resolves with operation result or throws DatabaseError
 */
async function withDatabaseErrorHandling(dbOperation) {
  try {
    return await dbOperation();
  } catch (error) {
    // Handle specific SQLite errors
    if (error.code && error.code.startsWith('SQLITE_')) {
      switch (error.code) {
        case 'SQLITE_BUSY':
        case 'SQLITE_LOCKED':
          throw new DatabaseError('Database is temporarily unavailable');
        case 'SQLITE_CORRUPT':
          throw new DatabaseError('Database corruption detected');
        case 'SQLITE_CANTOPEN':
          throw new DatabaseError('Unable to access database');
        default:
          throw new DatabaseError('Database operation failed');
      }
    }
    
    // Re-throw non-database errors
    throw error;
  }
}

/**
 * Create a standardized validation error from Zod validation results
 * @param {Object} zodError - Zod validation error
 * @returns {ValidationError} - Standardized validation error
 */
function createValidationError(zodError) {
  const issues = zodError.issues.map(issue => ({
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code
  }));
  
  return new ValidationError('Request validation failed', issues);
}

/**
 * Check if user exists and throw UserNotFoundError if not
 * @param {Object|null} user - User object from database
 * @param {string|number} userId - User ID that was searched for
 */
function ensureUserExists(user, userId) {
  if (!user) {
    throw new UserNotFoundError(userId);
  }
}

/**
 * Validate required fields in request body
 * @param {Object} body - Request body
 * @param {string[]} requiredFields - Array of required field names
 */
function validateRequiredFields(body, requiredFields) {
  const missingFields = requiredFields.filter(field => 
    body[field] === undefined || body[field] === null || body[field] === ''
  );
  
  if (missingFields.length > 0) {
    throw new BadRequestError(
      `Missing required fields: ${missingFields.join(', ')}`
    );
  }
}

module.exports = {
  validatePaginationParams,
  withDatabaseErrorHandling,
  createValidationError,
  ensureUserExists,
  validateRequiredFields
};