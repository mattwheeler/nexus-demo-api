'use strict';
const { ValidationError } = require('../errors/AppError');

/**
 * Validate activity endpoint request parameters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function validateActivityRequest(req, res, next) {
  try {
    const issues = [];
    
    // Validate user ID parameter
    const userId = req.params.id;
    if (!userId) {
      issues.push({
        path: 'params.id',
        message: 'User ID is required'
      });
    } else if (!/^\d+$/.test(userId)) {
      issues.push({
        path: 'params.id',
        message: 'User ID must be a positive integer'
      });
    }

    // Validate query parameters
    const { cursor, limit } = req.query;
    
    if (cursor !== undefined) {
      if (typeof cursor !== 'string' || cursor.trim() === '') {
        issues.push({
          path: 'query.cursor',
          message: 'Cursor must be a non-empty string'
        });
      }
    }

    if (limit !== undefined) {
      const parsedLimit = parseInt(limit, 10);
      if (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 100) {
        issues.push({
          path: 'query.limit',
          message: 'Limit must be a positive integer between 1 and 100'
        });
      }
    }

    // If there are validation issues, throw validation error
    if (issues.length > 0) {
      throw new ValidationError('Request validation failed', issues);
    }

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { validateActivityRequest };