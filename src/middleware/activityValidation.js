'use strict';

/**
 * Validates user ID parameter format
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function validateUserId(req, res, next) {
  const userId = req.params.user_id || req.params.id;
  
  if (!userId) {
    return res.status(400).json({
      error: 'User ID is required',
      message: 'user_id parameter is missing'
    });
  }
  
  // Check if user ID is a valid positive integer
  const parsedUserId = parseInt(userId, 10);
  if (isNaN(parsedUserId) || parsedUserId <= 0 || !Number.isInteger(parsedUserId)) {
    return res.status(400).json({
      error: 'Invalid user ID format',
      message: 'user_id must be a positive integer'
    });
  }
  
  // Store parsed user ID for use in route handlers
  req.validatedUserId = parsedUserId;
  next();
}

/**
 * Validates cursor-based pagination parameters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function validatePagination(req, res, next) {
  const { cursor, limit } = req.query;
  const validatedParams = {};
  
  // Validate limit parameter
  if (limit !== undefined) {
    const parsedLimit = parseInt(limit, 10);
    
    if (isNaN(parsedLimit) || parsedLimit <= 0 || !Number.isInteger(parsedLimit)) {
      return res.status(400).json({
        error: 'Invalid limit parameter',
        message: 'limit must be a positive integer'
      });
    }
    
    // Set reasonable maximum limit
    const MAX_LIMIT = 100;
    if (parsedLimit > MAX_LIMIT) {
      return res.status(400).json({
        error: 'Invalid limit parameter',
        message: `limit must not exceed ${MAX_LIMIT}`
      });
    }
    
    validatedParams.limit = parsedLimit;
  }
  
  // Validate cursor parameter if provided
  if (cursor !== undefined) {
    if (typeof cursor !== 'string' || cursor.trim() === '') {
      return res.status(400).json({
        error: 'Invalid cursor parameter',
        message: 'cursor must be a non-empty string'
      });
    }
    
    // Validate cursor format - should be base64 encoded JSON or timestamp
    try {
      // Try to decode as base64 first
      const decoded = Buffer.from(cursor, 'base64').toString('utf8');
      
      // Try to parse as JSON (for complex cursors)
      try {
        const cursorData = JSON.parse(decoded);
        if (!cursorData.timestamp && !cursorData.id) {
          throw new Error('Invalid cursor structure');
        }
        validatedParams.cursor = cursor;
      } catch (jsonError) {
        // If not JSON, validate as ISO timestamp
        const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
        if (!timestampRegex.test(decoded)) {
          throw new Error('Invalid cursor format');
        }
        validatedParams.cursor = cursor;
      }
    } catch (error) {
      // If base64 decoding fails, try as direct timestamp
      const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
      if (!timestampRegex.test(cursor)) {
        return res.status(400).json({
          error: 'Invalid cursor format',
          message: 'cursor must be a valid base64-encoded pagination token or ISO timestamp'
        });
      }
      validatedParams.cursor = cursor;
    }
  }
  
  // Store validated pagination parameters for use in route handlers
  req.validatedPagination = validatedParams;
  next();
}

/**
 * Validates optional event type filter parameter
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function validateEventType(req, res, next) {
  const { event_type } = req.query;
  
  if (event_type !== undefined) {
    if (typeof event_type !== 'string' || event_type.trim() === '') {
      return res.status(400).json({
        error: 'Invalid event_type parameter',
        message: 'event_type must be a non-empty string'
      });
    }
    
    // Validate event type format (alphanumeric, underscores, hyphens)
    const eventTypeRegex = /^[a-zA-Z0-9_-]+$/;
    if (!eventTypeRegex.test(event_type)) {
      return res.status(400).json({
        error: 'Invalid event_type format',
        message: 'event_type must contain only alphanumeric characters, underscores, and hyphens'
      });
    }
    
    req.validatedEventType = event_type;
  }
  
  next();
}

/**
 * Validates timestamp range parameters (since, until)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function validateTimeRange(req, res, next) {
  const { since, until } = req.query;
  const validatedParams = {};
  
  // Validate 'since' parameter
  if (since !== undefined) {
    const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    if (!timestampRegex.test(since)) {
      return res.status(400).json({
        error: 'Invalid since parameter',
        message: 'since must be a valid ISO timestamp (YYYY-MM-DDTHH:mm:ssZ)'
      });
    }
    
    // Validate that it's a valid date
    const sinceDate = new Date(since);
    if (isNaN(sinceDate.getTime())) {
      return res.status(400).json({
        error: 'Invalid since parameter',
        message: 'since must be a valid date'
      });
    }
    
    validatedParams.since = since;
  }
  
  // Validate 'until' parameter
  if (until !== undefined) {
    const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    if (!timestampRegex.test(until)) {
      return res.status(400).json({
        error: 'Invalid until parameter',
        message: 'until must be a valid ISO timestamp (YYYY-MM-DDTHH:mm:ssZ)'
      });
    }
    
    // Validate that it's a valid date
    const untilDate = new Date(until);
    if (isNaN(untilDate.getTime())) {
      return res.status(400).json({
        error: 'Invalid until parameter',
        message: 'until must be a valid date'
      });
    }
    
    validatedParams.until = until;
  }
  
  // Validate that 'since' is before 'until' if both are provided
  if (validatedParams.since && validatedParams.until) {
    const sinceDate = new Date(validatedParams.since);
    const untilDate = new Date(validatedParams.until);
    
    if (sinceDate >= untilDate) {
      return res.status(400).json({
        error: 'Invalid time range',
        message: 'since timestamp must be before until timestamp'
      });
    }
  }
  
  req.validatedTimeRange = validatedParams;
  next();
}

/**
 * Combined validation middleware for activity endpoints
 * Validates user ID, pagination, event type, and time range parameters
 */
function validateActivityRequest(req, res, next) {
  // Chain all validations
  validateUserId(req, res, (err) => {
    if (err) return next(err);
    
    validatePagination(req, res, (err) => {
      if (err) return next(err);
      
      validateEventType(req, res, (err) => {
        if (err) return next(err);
        
        validateTimeRange(req, res, next);
      });
    });
  });
}

module.exports = {
  validateUserId,
  validatePagination,
  validateEventType,
  validateTimeRange,
  validateActivityRequest
};