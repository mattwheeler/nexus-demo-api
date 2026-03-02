'use strict';

/**
 * Formats activity response with consistent structure including activities array,
 * pagination metadata, and proper JSON serialization of metadata fields.
 * 
 * @param {Object} data - The raw data from database service
 * @param {Array} data.activities - Array of activity records from database
 * @param {number} data.total - Total count of activities for the user
 * @param {Object} pagination - Pagination parameters
 * @param {number} pagination.limit - Items per page limit
 * @param {number} pagination.offset - Offset for pagination
 * @returns {Object} Formatted response object
 */
function formatActivityResponse(data, pagination) {
  const { activities = [], total = 0 } = data;
  const { limit, offset } = pagination;
  
  // Calculate hasMore based on current offset, limit, and total
  const hasMore = (offset + limit) < total;
  
  // Format activities with consistent field names and proper JSON serialization
  const formattedActivities = activities.map(activity => {
    const formatted = {
      id: activity.id,
      user_id: activity.user_id,
      type: activity.type,
      description: activity.description,
      created_at: activity.created_at
    };
    
    // Parse metadata if it exists and is valid JSON
    if (activity.metadata) {
      try {
        formatted.metadata = JSON.parse(activity.metadata);
      } catch (error) {
        // If metadata is not valid JSON, include as string
        formatted.metadata = activity.metadata;
      }
    }
    
    return formatted;
  });
  
  return {
    activities: formattedActivities,
    pagination: {
      limit,
      offset,
      total,
      hasMore
    }
  };
}

module.exports = { formatActivityResponse };