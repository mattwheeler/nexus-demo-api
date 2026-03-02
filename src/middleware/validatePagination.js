'use strict';
const { ValidationError } = require('./errorHandler');

/**
 * Middleware to validate pagination parameters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function validatePagination(req, res, next) {
  const { limit, cursor, order } = req.query;
  const issues = [];

  // Validate limit
  if (limit !== undefined) {
    const limitNum = parseInt(limit, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      issues.push({
        path: 'limit',
        message: 'Limit must be a number between 1 and 100'
      });
    } else {
      req.query.limit = limitNum;
    }
  } else {
    req.query.limit = 10; // Default limit
  }

  // Validate cursor (if provided)
  if (cursor !== undefined) {
    if (typeof cursor !== 'string' || cursor.length === 0) {
      issues.push({
        path: 'cursor',
        message: 'Cursor must be a non-empty string'
      });
    }
  }

  // Validate order
  if (order !== undefined) {
    if (!['asc', 'desc'].includes(order.toLowerCase())) {
      issues.push({
        path: 'order',
        message: 'Order must be either "asc" or "desc"'
      });
    } else {
      req.query.order = order.toLowerCase();
    }
  } else {
    req.query.order = 'desc'; // Default order
  }

  if (issues.length > 0) {
    return next(new ValidationError('Invalid pagination parameters', issues));
  }

  next();
}

module.exports = { validatePagination };