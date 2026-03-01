'use strict';
const { ActivityQuerySchema } = require('../schemas/activitySchema');

/**
 * Middleware to validate activity query parameters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function validateActivityQuery(req, res, next) {
  const result = ActivityQuerySchema.safeParse(req.query);
  if (!result.success) {
    return res.status(422).json({
      error: 'Validation failed',
      issues: result.error.issues.map(i => ({ 
        path: i.path.join('.'), 
        message: i.message 
      }))
    });
  }
  req.query = result.data;
  next();
}

module.exports = { validateActivityQuery };