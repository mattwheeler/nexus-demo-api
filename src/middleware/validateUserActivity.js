'use strict';

/**
 * Validates if a string is a valid UUID (v4 format)
 * @param {string} str - String to validate
 * @returns {boolean} True if valid UUID
 */
function isValidUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Validates if a string is a valid integer
 * @param {string} str - String to validate
 * @returns {boolean} True if valid integer
 */
function isValidInteger(str) {
  const num = parseInt(str, 10);
  return !isNaN(num) && num.toString() === str && num > 0;
}

/**
 * Validates if a cursor has valid format (base64 encoded string)
 * @param {string} cursor - Cursor to validate
 * @returns {boolean} True if valid cursor format
 */
function isValidCursor(cursor) {
  if (typeof cursor !== 'string' || cursor.length === 0) {
    return false;
  }
  
  // Check if it's a valid base64 string
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(cursor)) {
    return false;
  }
  
  // Try to decode to ensure it's valid base64
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf8');
    return decoded.length > 0;
  } catch (err) {
    return false;
  }
}

/**
 * Middleware to validate user activity endpoint parameters
 * Validates user ID format, cursor parameter, and limit parameter
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function validateUserActivityParams(req, res, next) {
  const { id } = req.params;
  const { cursor, limit } = req.query;
  
  // Validate user ID format (must be UUID or integer)
  if (!id) {
    return res.status(400).json({
      error: 'User ID is required'
    });
  }
  
  if (!isValidUUID(id) && !isValidInteger(id)) {
    return res.status(400).json({
      error: 'User ID must be a valid UUID or positive integer'
    });
  }
  
  // Validate cursor parameter if provided
  if (cursor !== undefined) {
    if (!isValidCursor(cursor)) {
      return res.status(400).json({
        error: 'Cursor must be a valid base64 encoded string'
      });
    }
  }
  
  // Validate limit parameter
  if (limit !== undefined) {
    const limitNum = parseInt(limit, 10);
    
    if (isNaN(limitNum) || limitNum.toString() !== limit) {
      return res.status(400).json({
        error: 'Limit must be a valid integer'
      });
    }
    
    if (limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        error: 'Limit must be between 1 and 100'
      });
    }
    
    // Store the parsed limit for use in the route handler
    req.query.limit = limitNum;
  }
  
  next();
}

module.exports = {
  validateUserActivityParams,
  isValidUUID,
  isValidInteger,
  isValidCursor
};