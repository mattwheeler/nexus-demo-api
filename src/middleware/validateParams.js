'use strict';

/**
 * Validates user ID parameter format
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @returns {void}
 */
function validateUserId(req, res, next) {
  const { id } = req.params;
  
  if (!id) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'User ID is required'
    });
  }
  
  // Check if ID is a positive integer
  const userId = parseInt(id, 10);
  if (isNaN(userId) || userId <= 0 || !Number.isInteger(userId)) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'User ID must be a positive integer'
    });
  }
  
  // Store parsed ID for use in route handler
  req.params.id = userId;
  next();
}

/**
 * Validates cursor parameter format (optional)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @returns {void}
 */
function validateCursor(req, res, next) {
  const { cursor } = req.query;
  
  // Cursor is optional
  if (!cursor) {
    return next();
  }
  
  // Validate cursor format - should be base64 encoded string
  const base64Regex = /^[A-Za-z0-9+/]+(=){0,2}$/;
  if (typeof cursor !== 'string' || cursor.length === 0) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Cursor must be a non-empty string'
    });
  }
  
  if (!base64Regex.test(cursor)) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Cursor must be a valid base64 encoded string'
    });
  }
  
  // Try to decode to ensure it's valid base64
  try {
    Buffer.from(cursor, 'base64').toString();
  } catch (err) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Cursor must be a valid base64 encoded string'
    });
  }
  
  next();
}

/**
 * Validates limit parameter with bounds checking
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @returns {void}
 */
function validateLimit(req, res, next) {
  let { limit } = req.query;
  
  // Set default limit if not provided
  if (!limit) {
    req.query.limit = 10;
    return next();
  }
  
  // Parse limit
  const parsedLimit = parseInt(limit, 10);
  
  // Validate limit format
  if (isNaN(parsedLimit) || !Number.isInteger(parsedLimit)) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Limit must be an integer'
    });
  }
  
  // Check bounds: min 1, max 50
  if (parsedLimit < 1) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Limit must be at least 1'
    });
  }
  
  if (parsedLimit > 50) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Limit must not exceed 50'
    });
  }
  
  // Store parsed limit
  req.query.limit = parsedLimit;
  next();
}

/**
 * Combined middleware for activity endpoints that validates all parameters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @returns {void}
 */
function validateActivityParams(req, res, next) {
  // First validate user ID
  validateUserId(req, res, (err) => {
    if (err) return next(err);
    
    // Then validate cursor
    validateCursor(req, res, (err) => {
      if (err) return next(err);
      
      // Finally validate limit
      validateLimit(req, res, next);
    });
  });
}

module.exports = {
  validateUserId,
  validateCursor,
  validateLimit,
  validateActivityParams
};