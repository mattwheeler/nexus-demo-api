'use strict';
const { z } = require('zod');

/**
 * Validation schema for user ID parameter
 * Validates that the user ID is a positive integer
 */
const userIdSchema = z.string().regex(/^\d+$/, 'User ID must be a positive integer').transform(val => parseInt(val, 10));

/**
 * Validation schema for pagination query parameters
 * - limit: between 1-100, defaults to 10
 * - cursor: optional base64 encoded string for pagination
 */
const paginationQuerySchema = z.object({
  limit: z.string()
    .optional()
    .default('10')
    .transform(val => parseInt(val, 10))
    .refine(val => !isNaN(val) && val >= 1 && val <= 100, {
      message: 'Limit must be a number between 1 and 100'
    }),
  cursor: z.string()
    .optional()
    .refine(val => {
      if (!val) return true;
      try {
        // Validate base64 format and ensure it contains valid cursor data
        const decoded = Buffer.from(val, 'base64').toString('utf-8');
        // Basic check that decoded cursor looks like a timestamp or ID
        return /^[0-9-T:.Z]+$|^\d+$/.test(decoded);
      } catch {
        return false;
      }
    }, {
      message: 'Cursor must be a valid base64 encoded pagination token'
    })
});

/**
 * Middleware to validate user ID parameter
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function validateUserId(req, res, next) {
  try {
    const result = userIdSchema.safeParse(req.params.id);
    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid user ID',
        message: result.error.issues[0].message
      });
    }
    // Replace string ID with parsed integer
    req.params.id = result.data;
    next();
  } catch (error) {
    return res.status(400).json({
      error: 'Invalid user ID format',
      message: 'User ID must be a positive integer'
    });
  }
}

/**
 * Middleware to validate pagination query parameters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function validatePaginationQuery(req, res, next) {
  try {
    const result = paginationQuerySchema.safeParse(req.query);
    if (!result.success) {
      const firstError = result.error.issues[0];
      return res.status(400).json({
        error: 'Invalid query parameters',
        message: firstError.message,
        field: firstError.path.join('.')
      });
    }
    // Replace query params with validated and transformed values
    req.query.limit = result.data.limit;
    if (result.data.cursor) {
      req.query.cursor = result.data.cursor;
    }
    next();
  } catch (error) {
    return res.status(400).json({
      error: 'Invalid query parameters',
      message: 'Failed to validate query parameters'
    });
  }
}

/**
 * Combined middleware for user activity endpoints
 * Validates both user ID and pagination parameters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function validateUserActivityRequest(req, res, next) {
  // First validate user ID
  validateUserId(req, res, (error) => {
    if (error) return;
    // Then validate pagination query parameters
    validatePaginationQuery(req, res, next);
  });
}

module.exports = {
  validateUserId,
  validatePaginationQuery,
  validateUserActivityRequest
};