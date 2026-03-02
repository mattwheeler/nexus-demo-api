'use strict';

/**
 * Validates user activity endpoint parameters and query parameters
 * - user_id: must be a positive integer
 * - limit: optional, 1-50 range, defaults to 10
 * - offset: optional, non-negative integer, defaults to 0
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 */
function validateUserActivity(req, res, next) {
  const errors = [];
  
  // Validate user_id parameter
  const userId = req.params.user_id;
  if (!userId) {
    errors.push({ field: 'user_id', message: 'user_id parameter is required' });
  } else {
    const userIdNum = parseInt(userId, 10);
    if (isNaN(userIdNum) || userIdNum <= 0 || !Number.isInteger(userIdNum)) {
      errors.push({ field: 'user_id', message: 'user_id must be a positive integer' });
    } else {
      req.params.user_id = userIdNum;
    }
  }
  
  // Validate limit query parameter
  let limit = 10; // default
  if (req.query.limit !== undefined) {
    const limitNum = parseInt(req.query.limit, 10);
    if (isNaN(limitNum) || !Number.isInteger(limitNum)) {
      errors.push({ field: 'limit', message: 'limit must be an integer' });
    } else if (limitNum < 1 || limitNum > 50) {
      errors.push({ field: 'limit', message: 'limit must be between 1 and 50' });
    } else {
      limit = limitNum;
    }
  }
  req.query.limit = limit;
  
  // Validate offset query parameter
  let offset = 0; // default
  if (req.query.offset !== undefined) {
    const offsetNum = parseInt(req.query.offset, 10);
    if (isNaN(offsetNum) || !Number.isInteger(offsetNum)) {
      errors.push({ field: 'offset', message: 'offset must be an integer' });
    } else if (offsetNum < 0) {
      errors.push({ field: 'offset', message: 'offset must be a non-negative integer' });
    } else {
      offset = offsetNum;
    }
  }
  req.query.offset = offset;
  
  // If there are validation errors, return 400 Bad Request
  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Invalid input parameters',
      details: errors
    });
  }
  
  next();
}

module.exports = { validateUserActivity };