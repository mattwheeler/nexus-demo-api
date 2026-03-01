'use strict';
const { ActivityQuerySchema } = require('../models/Activity');

/**
 * Middleware to validate query parameters for activity endpoints
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function validateActivityQuery(req, res, next) {
  try {
    const result = ActivityQuerySchema.safeParse(req.query);
    
    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        issues: result.error.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message
        }))
      });
    }
    
    // Replace query with validated and transformed data
    req.query = result.data;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  validateActivityQuery
};