'use strict';

/**
 * Validates user ID parameter
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function validateUserId(req, res, next) {
  const { id } = req.params;
  
  if (!id) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'User ID is required'
    });
  }
  
  // Check if ID is a valid positive integer
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
 * Validates cursor parameter for pagination
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function validateCursor(req, res, next) {
  const { cursor } = req.query;
  
  if (cursor !== undefined) {
    // Cursor should be a valid ISO date string or timestamp
    const cursorDate = new Date(cursor);
    if (isNaN(cursorDate.getTime())) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Cursor must be a valid date string'
      });
    }
  }
  
  next();
}

/**
 * Validates limit parameter with bounds checking
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function validateLimit(req, res, next) {
  const { limit } = req.query;
  
  if (limit !== undefined) {
    const limitNum = parseInt(limit, 10);
    
    if (isNaN(limitNum) || !Number.isInteger(limitNum)) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Limit must be an integer'
      });
    }
    
    if (limitNum < 1 || limitNum > 50) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Limit must be between 1 and 50'
      });
    }
    
    // Store parsed limit for use in route handler
    req.query.limit = limitNum;
  } else {
    // Set default limit if not provided
    req.query.limit = 10;
  }
  
  next();
}

/**
 * Composite middleware for validating activity endpoint parameters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function validateActivityParams(req, res, next) {
  validateUserId(req, res, (err) => {
    if (err || res.headersSent) return;
    
    validateCursor(req, res, (err) => {
      if (err || res.headersSent) return;
      
      validateLimit(req, res, next);
    });
  });
}

/**
 * Generic parameter validation middleware factory
 * @param {Object} validations - Object containing validation rules
 * @param {Function} validations.params - Function to validate params
 * @param {Function} validations.query - Function to validate query parameters
 * @param {Function} validations.body - Function to validate request body
 * @returns {Function} Express middleware function
 */
function validateParams(validations = {}) {
  return (req, res, next) => {
    const errors = [];
    
    // Validate params
    if (validations.params) {
      try {
        const result = validations.params(req.params);
        if (result.error) errors.push(result.error);
        else req.params = { ...req.params, ...result.data };
      } catch (err) {
        errors.push(err.message);
      }
    }
    
    // Validate query
    if (validations.query) {
      try {
        const result = validations.query(req.query);
        if (result.error) errors.push(result.error);
        else req.query = { ...req.query, ...result.data };
      } catch (err) {
        errors.push(err.message);
      }
    }
    
    // Validate body
    if (validations.body) {
      try {
        const result = validations.body(req.body);
        if (result.error) errors.push(result.error);
        else req.body = result.data;
      } catch (err) {
        errors.push(err.message);
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        messages: errors
      });
    }
    
    next();
  };
}

module.exports = {
  validateUserId,
  validateCursor,
  validateLimit,
  validateActivityParams,
  validateParams
};