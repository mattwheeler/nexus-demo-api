'use strict';
const { z } = require('zod');
const { getUser } = require('../models/User');

// Validation schemas
const UserIdSchema = z.coerce.number().int().positive('User ID must be a positive integer');

const CursorSchema = z.string().datetime('Cursor must be a valid ISO datetime string');

const LimitSchema = z.coerce.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100');

const ActivityQuerySchema = z.object({
  limit: LimitSchema.optional().default(20),
  cursor: CursorSchema.optional(),
  eventType: z.string().min(1).max(100).optional()
});

/**
 * Validates userId parameter from request params
 * Ensures the user ID is valid format and the user exists
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function validateUserId(req, res, next) {
  try {
    // Validate userId parameter format
    const userIdResult = UserIdSchema.safeParse(req.params.userId);
    
    if (!userIdResult.success) {
      return res.status(400).json({
        error: 'Invalid user ID format',
        details: userIdResult.error.issues.map(issue => ({
          path: 'userId',
          message: issue.message
        }))
      });
    }
    
    const userId = userIdResult.data;
    
    // Check if user exists
    const user = await getUser(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        details: [{
          path: 'userId',
          message: `User with ID ${userId} does not exist`
        }]
      });
    }
    
    // Store validated userId in request for use in subsequent middleware/handlers
    req.validatedUserId = userId;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Validates activity query parameters (cursor, limit, eventType)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function validateActivityQuery(req, res, next) {
  try {
    const queryResult = ActivityQuerySchema.safeParse(req.query);
    
    if (!queryResult.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: queryResult.error.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message
        }))
      });
    }
    
    // Store validated query parameters in request
    req.validatedQuery = queryResult.data;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Combined middleware for activity endpoints that validates both userId and query parameters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function validateActivityRequest(req, res, next) {
  // First validate userId
  await new Promise((resolve, reject) => {
    validateUserId(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  }).catch(next);
  
  // If userId validation passed, validate query parameters
  if (!res.headersSent) {
    validateActivityQuery(req, res, next);
  }
}

/**
 * Validates activity event creation data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function validateActivityEventData(req, res, next) {
  try {
    const EventDataSchema = z.object({
      eventType: z.string().min(1, 'Event type is required').max(100, 'Event type too long'),
      timestamp: z.string().datetime('Timestamp must be a valid ISO datetime string').optional(),
      metadata: z.record(z.any()).optional()
    });
    
    const result = EventDataSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid activity event data',
        details: result.error.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message
        }))
      });
    }
    
    req.validatedEventData = result.data;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  validateUserId,
  validateActivityQuery,
  validateActivityRequest,
  validateActivityEventData
};