'use strict';
const { z } = require('zod');

/**
 * Validation schema for user ID parameter
 * Accepts either integer or UUID format
 */
const userIdSchema = z.union([
  z.string().regex(/^\d+$/, 'User ID must be a valid integer').transform(val => parseInt(val, 10)),
  z.string().uuid('User ID must be a valid UUID'),
  z.number().int().positive('User ID must be a positive integer')
]);

/**
 * Validation schema for pagination query parameters
 */
const paginationSchema = z.object({
  limit: z
    .string()
    .optional()
    .transform(val => val ? parseInt(val, 10) : 10)
    .pipe(
      z.number()
        .int('Limit must be an integer')
        .min(1, 'Limit must be at least 1')
        .max(50, 'Limit cannot exceed 50')
        .default(10)
    ),
  cursor: z
    .string()
    .optional()
    .refine(
      val => !val || /^[a-zA-Z0-9+/]+=*$/.test(val),
      'Cursor must be a valid base64 encoded string'
    )
}).strict();

/**
 * Middleware to validate user activity endpoint parameters
 * Validates user ID from params and pagination parameters from query
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function validateUserActivity(req, res, next) {
  const errors = [];

  // Validate user ID parameter
  try {
    const userIdResult = userIdSchema.safeParse(req.params.id);
    if (!userIdResult.success) {
      errors.push({
        field: 'id',
        message: userIdResult.error.issues[0].message
      });
    } else {
      req.params.id = userIdResult.data;
    }
  } catch (error) {
    errors.push({
      field: 'id',
      message: 'Invalid user ID format'
    });
  }

  // Validate pagination query parameters
  try {
    const queryResult = paginationSchema.safeParse(req.query);
    if (!queryResult.success) {
      queryResult.error.issues.forEach(issue => {
        errors.push({
          field: issue.path.join('.'),
          message: issue.message
        });
      });
    } else {
      // Sanitize and normalize query parameters
      req.query = {
        ...req.query,
        limit: queryResult.data.limit,
        cursor: queryResult.data.cursor || null
      };
    }
  } catch (error) {
    errors.push({
      field: 'query',
      message: 'Invalid query parameters'
    });
  }

  // Return validation errors if any
  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Invalid request parameters',
      details: errors
    });
  }

  next();
}

module.exports = { validateUserActivity };