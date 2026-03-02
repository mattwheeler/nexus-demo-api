'use strict';
const { z } = require('zod');

/**
 * Activity query validation schema
 * Validates query parameters for the activity endpoint
 */
const ActivityQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => val ? parseInt(val, 10) : undefined)
    .refine((val) => val === undefined || (val >= 1 && val <= 1000), {
      message: 'Limit must be between 1 and 1000'
    }),
  cursor: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      try {
        const decoded = Buffer.from(val, 'base64').toString('utf-8');
        const date = new Date(decoded);
        return !isNaN(date.getTime());
      } catch {
        return false;
      }
    }, {
      message: 'Invalid cursor format'
    }),
  type: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      return /^[a-zA-Z0-9_-]+$/.test(val);
    }, {
      message: 'Event type must contain only letters, numbers, hyphens, and underscores'
    })
});

/**
 * User ID validation schema
 * Validates the user ID parameter
 */
const UserIdSchema = z
  .string()
  .regex(/^\d+$/, 'User ID must be a positive integer')
  .transform((val) => parseInt(val, 10))
  .refine((val) => val > 0, {
    message: 'User ID must be a positive integer'
  });

/**
 * Middleware to validate activity query parameters and user ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function validateActivityQuery(req, res, next) {
  try {
    // Validate user ID parameter
    const userIdResult = UserIdSchema.safeParse(req.params.id);
    if (!userIdResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        type: 'VALIDATION_ERROR',
        details: userIdResult.error.issues.map(issue => ({
          path: 'userId',
          message: issue.message
        })),
        timestamp: new Date().toISOString()
      });
    }
    
    // Store validated user ID
    req.validatedUserId = userIdResult.data;
    
    // Validate query parameters
    const queryResult = ActivityQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        type: 'VALIDATION_ERROR',
        details: queryResult.error.issues.map(issue => ({
          path: Array.isArray(issue.path) ? issue.path.join('.') : issue.path || 'unknown',
          message: issue.message
        })),
        timestamp: new Date().toISOString()
      });
    }
    
    // Replace query with validated data
    req.query = queryResult.data;
    
    next();
  } catch (error) {
    // Handle unexpected validation errors
    return res.status(500).json({
      error: 'Internal validation error',
      type: 'INTERNAL_SERVER_ERROR',
      details: [{
        path: 'validation',
        message: 'An unexpected error occurred during validation'
      }],
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = {
  validateActivityQuery,
  ActivityQuerySchema,
  UserIdSchema
};