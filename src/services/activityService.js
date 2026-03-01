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
 * Retrieve paginated activities for a specific user
 * @param {string|number} userId - User ID
 * @param {Object} options - Pagination options
 * @param {number} [options.limit=10] - Number of activities to retrieve
 * @param {string} [options.cursor] - Cursor for pagination
 * @returns {Promise<Object>} Paginated activities result
 * @throws {InvalidCursorError} When cursor is invalid
 */
async function getActivitiesForUser(userId, options = {}) {
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
    const activities = await getActivities(userId, { limit, cursor: cursorData });
    
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

module.exports = {
  getActivitiesForUser,
  InvalidCursorError
};