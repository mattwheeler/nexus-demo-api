'use strict';

/**
 * Middleware to validate pagination parameters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function validatePaginationParams(req, res, next) {
  const { limit, cursor } = req.query;
  
  // Validate limit parameter
  if (limit !== undefined) {
    const limitNum = parseInt(limit, 10);
    
    if (isNaN(limitNum)) {
      return res.status(400).json({
        error: 'Invalid limit parameter',
        message: 'Limit must be a valid number'
      });
    }
    
    if (limitNum < 1) {
      return res.status(400).json({
        error: 'Invalid limit parameter',
        message: 'Limit must be greater than 0'
      });
    }
    
    if (limitNum > 100) {
      return res.status(400).json({
        error: 'Invalid limit parameter',
        message: 'Limit cannot exceed 100'
      });
    }
    
    req.query.limit = limitNum;
  }
  
  // Validate cursor parameter if provided
  if (cursor !== undefined) {
    if (typeof cursor !== 'string' || cursor.trim() === '') {
      return res.status(400).json({
        error: 'Invalid cursor parameter',
        message: 'Cursor must be a non-empty string'
      });
    }
    
    // Basic validation - cursor should be base64 encoded
    try {
      const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded);
      
      if (!parsed.id || !parsed.created_at) {
        throw new Error('Invalid cursor structure');
      }
    } catch (err) {
      return res.status(400).json({
        error: 'Invalid cursor format',
        message: 'Cursor must be a valid base64-encoded token'
      });
    }
  }
  
  next();
}

module.exports = { validatePaginationParams };