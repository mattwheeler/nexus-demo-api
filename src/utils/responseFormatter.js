'use strict';

/**
 * Formats activity event data according to the defined schema
 * @param {Object} event - Raw activity event from database
 * @returns {Object} Formatted activity event
 */
function formatActivityEvent(event) {
  if (!event) return null;

  return {
    id: event.id || null,
    type: event.type || null,
    description: event.description || null,
    created_at: event.created_at || null,
    user_id: event.user_id || null
  };
}

/**
 * Creates pagination metadata object
 * @param {Object} options - Pagination options
 * @param {string|null} options.cursor - Current cursor value
 * @param {number} options.limit - Number of items per page
 * @param {boolean} options.hasMore - Whether there are more items available
 * @param {string|null} options.nextCursor - Cursor for next page
 * @returns {Object} Pagination metadata
 */
function createPaginationMetadata({ cursor = null, limit = 20, hasMore = false, nextCursor = null }) {
  return {
    cursor: cursor,
    limit: limit,
    has_more: hasMore,
    next_cursor: nextCursor
  };
}

/**
 * Formats the complete response with data and pagination
 * @param {Array} activities - Array of raw activity events
 * @param {Object} paginationOptions - Pagination configuration
 * @returns {Object} Formatted API response
 */
function formatActivityResponse(activities = [], paginationOptions = {}) {
  // Filter out any null/undefined activities and format them
  const formattedActivities = activities
    .filter(activity => activity != null)
    .map(formatActivityEvent)
    .filter(activity => activity != null);

  // Create pagination metadata
  const pagination = createPaginationMetadata(paginationOptions);

  return {
    data: formattedActivities,
    pagination: pagination
  };
}

/**
 * Formats a single user object response
 * @param {Object} user - Raw user data from database
 * @returns {Object} Formatted user response
 */
function formatUserResponse(user) {
  if (!user) return null;

  return {
    id: user.id || null,
    name: user.name || null,
    email: user.email || null,
    created_at: user.created_at || null
  };
}

/**
 * Generic success response formatter
 * @param {*} data - Response data
 * @param {Object} metadata - Optional metadata
 * @returns {Object} Formatted success response
 */
function formatSuccessResponse(data, metadata = {}) {
  const response = { data };
  
  // Add metadata if provided
  if (Object.keys(metadata).length > 0) {
    Object.assign(response, metadata);
  }
  
  return response;
}

/**
 * Formats error response consistently
 * @param {string} message - Error message
 * @param {Array} issues - Optional validation issues
 * @returns {Object} Formatted error response
 */
function formatErrorResponse(message, issues = null) {
  const response = { error: message };
  
  if (issues && Array.isArray(issues)) {
    response.issues = issues;
  }
  
  return response;
}

module.exports = {
  formatActivityEvent,
  createPaginationMetadata,
  formatActivityResponse,
  formatUserResponse,
  formatSuccessResponse,
  formatErrorResponse
};