'use strict';
const { getActivitiesForUser, generateCursor } = require('../models/Activity');

/**
 * Retrieve activities for a user with cursor-based pagination
 * @param {number} userId - User ID to fetch activities for
 * @param {Object} options - Pagination options
 * @param {string} [options.cursor] - Cursor token for pagination
 * @param {number} [options.limit=10] - Number of activities to fetch (default: 10)
 * @returns {Promise<Object>} Object containing activities and pagination metadata
 */
async function getUserActivities(userId, { cursor, limit = 10 } = {}) {
  // Validate inputs
  if (!userId || typeof userId !== 'number') {
    throw new Error('Valid user ID is required');
  }
  
  if (limit && (typeof limit !== 'number' || limit < 1 || limit > 100)) {
    throw new Error('Limit must be a number between 1 and 100');
  }

  // Fetch one extra record to determine if there are more results
  const fetchLimit = limit + 1;
  const activities = await getActivitiesForUser(userId, { cursor, limit: fetchLimit });
  
  // Check if there are more results
  const hasNext = activities.length > limit;
  const results = hasNext ? activities.slice(0, limit) : activities;
  
  // Generate next cursor from the last item's timestamp
  let nextCursor = null;
  if (hasNext && results.length > 0) {
    const lastActivity = results[results.length - 1];
    nextCursor = generateCursor(lastActivity.created_at);
  }
  
  return {
    activities: results,
    pagination: {
      hasNext,
      cursor: nextCursor,
      limit
    }
  };
}

/**
 * Validate and parse pagination parameters from request
 * @param {Object} query - Request query parameters
 * @param {string} [query.cursor] - Cursor token
 * @param {string} [query.limit] - Limit as string
 * @returns {Object} Parsed pagination options
 */
function parsePaginationParams(query) {
  const options = {};
  
  if (query.cursor) {
    options.cursor = query.cursor;
  }
  
  if (query.limit) {
    const limit = parseInt(query.limit, 10);
    if (isNaN(limit) || limit < 1 || limit > 100) {
      throw new Error('Limit must be a number between 1 and 100');
    }
    options.limit = limit;
  }
  
  return options;
}

module.exports = {
  getUserActivities,
  parsePaginationParams
};