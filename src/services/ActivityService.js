'use strict';
const { getMockActivitiesForUser } = require('../data/mockActivityData');
const { PaginationCursorSchema } = require('../types/activity');

/**
 * Service class for handling user activity operations
 */
class ActivityService {
  /**
   * Get user activities with cursor-based pagination
   * @param {string} userId - User ID to fetch activities for
   * @param {Object} options - Pagination options
   * @param {string} [options.cursor] - Pagination cursor (base64 encoded timestamp+id)
   * @param {number} [options.limit=20] - Number of activities to return (1-100)
   * @returns {Promise<Object>} Activity response with activities, nextCursor, and hasMore
   */
  async getUserActivity(userId, options = {}) {
    const { cursor, limit = 20 } = options;
    
    // Validate inputs
    if (!userId) {
      throw new Error('userId is required');
    }
    
    if (limit < 1 || limit > 100) {
      throw new Error('limit must be between 1 and 100');
    }
    
    // Get all activities for the user (sorted by timestamp desc, then by id desc)
    const allActivities = getMockActivitiesForUser(userId)
      .sort((a, b) => {
        const timestampDiff = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        if (timestampDiff !== 0) return timestampDiff;
        return b.id.localeCompare(a.id); // Secondary sort by id desc for consistency
      });
    
    let startIndex = 0;
    
    // If cursor is provided, find the starting position
    if (cursor) {
      try {
        const cursorData = this._decodeCursor(cursor);
        
        // Find the index of the item after the cursor
        startIndex = allActivities.findIndex(activity => {
          const activityTime = new Date(activity.timestamp).getTime();
          const cursorTime = new Date(cursorData.timestamp).getTime();
          
          // If timestamps are different, compare them
          if (activityTime !== cursorTime) {
            return activityTime < cursorTime;
          }
          
          // If timestamps are the same, compare IDs
          return activity.id < cursorData.id;
        });
        
        // If no matching item found, start from the end (no more results)
        if (startIndex === -1) {
          startIndex = allActivities.length;
        }
      } catch (error) {
        throw new Error('Invalid cursor format');
      }
    }
    
    // Get the requested page of activities
    const activities = allActivities.slice(startIndex, startIndex + limit);
    
    // Determine if there are more results
    const hasMore = startIndex + limit < allActivities.length;
    
    // Generate next cursor if there are more results
    let nextCursor = null;
    if (hasMore && activities.length > 0) {
      const lastActivity = activities[activities.length - 1];
      nextCursor = this._encodeCursor({
        timestamp: lastActivity.timestamp,
        id: lastActivity.id
      });
    }
    
    return {
      activities,
      nextCursor,
      hasMore
    };
  }
  
  /**
   * Encode cursor data to base64 string
   * @private
   * @param {Object} cursorData - Cursor data containing timestamp and id
   * @returns {string} Base64 encoded cursor
   */
  _encodeCursor(cursorData) {
    // Validate cursor data
    const result = PaginationCursorSchema.safeParse(cursorData);
    if (!result.success) {
      throw new Error('Invalid cursor data');
    }
    
    const cursorString = JSON.stringify(cursorData);
    return Buffer.from(cursorString, 'utf8').toString('base64');
  }
  
  /**
   * Decode base64 cursor string to cursor data
   * @private
   * @param {string} cursor - Base64 encoded cursor
   * @returns {Object} Decoded cursor data
   */
  _decodeCursor(cursor) {
    try {
      const cursorString = Buffer.from(cursor, 'base64').toString('utf8');
      const cursorData = JSON.parse(cursorString);
      
      // Validate decoded cursor data
      const result = PaginationCursorSchema.safeParse(cursorData);
      if (!result.success) {
        throw new Error('Invalid cursor structure');
      }
      
      return result.data;
    } catch (error) {
      throw new Error('Invalid cursor format');
    }
  }
}

module.exports = { ActivityService };