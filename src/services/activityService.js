'use strict';
const { getActivities } = require('../models/Activity');

/**
 * Custom error class for invalid cursor tokens
 */
class InvalidCursorError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidCursorError';
  }
}

/**
 * Parse pagination parameters from query string
 * @param {Object} query - Express query object
 * @returns {Object} Parsed pagination options
 * @throws {Error} When parameters are invalid
 */
function parsePaginationParams(query = {}) {
  const { limit, cursor } = query;
  
  const options = {};
  
  // Parse limit
  if (limit !== undefined) {
    const parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }
    options.limit = parsedLimit;
  }
  
  // Parse cursor
  if (cursor) {
    options.cursor = cursor;
  }
  
  return options;
}

/**
 * Retrieve paginated activities for a specific user
 * @param {string|number} userId - User ID
 * @param {Object} options - Pagination options
 * @param {number} [options.limit=10] - Number of activities to retrieve
 * @param {string} [options.cursor] - Cursor for pagination
 * @returns {Promise<Object>} Paginated activities result
 * @throws {InvalidCursorError} When cursor is invalid
 */
async function getActivitiesForUser(userId, options = {}) {
  // Validate user ID
  const parsedUserId = parseInt(userId, 10);
  if (isNaN(parsedUserId) || parsedUserId < 1) {
    throw new Error('Valid user ID is required');
  }
  
  const { limit = 10, cursor } = options;
  
  let cursorData = null;
  
  // Parse cursor if provided
  if (cursor) {
    try {
      const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
      cursorData = JSON.parse(decoded);
      
      // Validate cursor structure
      if (!cursorData.id || !cursorData.created_at) {
        throw new InvalidCursorError('Cursor missing required fields (id, created_at)');
      }
      
      // Validate cursor data types
      if (typeof cursorData.id !== 'number' || typeof cursorData.created_at !== 'string') {
        throw new InvalidCursorError('Cursor contains invalid data types');
      }
      
    } catch (err) {
      if (err instanceof InvalidCursorError) {
        throw err;
      }
      throw new InvalidCursorError('Invalid cursor format - must be valid base64 JSON');
    }
  }
  
  try {
    const activities = await getActivities(parsedUserId, { limit, cursor: cursorData });
    
    // Generate next cursor if there are more results
    let nextCursor = null;
    const hasNext = activities.length === limit;
    
    if (hasNext && activities.length > 0) {
      const lastActivity = activities[activities.length - 1];
      const cursorPayload = {
        id: lastActivity.id,
        created_at: lastActivity.created_at
      };
      nextCursor = Buffer.from(JSON.stringify(cursorPayload)).toString('base64');
    }
    
    return {
      activities,
      limit,
      hasNext,
      nextCursor
    };
  } catch (err) {
    // Re-throw database errors as service errors
    throw new Error(`Failed to retrieve activities: ${err.message}`);
  }
}

// Alias for backward compatibility
const getUserActivities = getActivitiesForUser;

module.exports = {
  getActivitiesForUser,
  getUserActivities,
  parsePaginationParams,
  InvalidCursorError
};