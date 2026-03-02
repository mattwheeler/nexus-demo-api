'use strict';
const { Activity } = require('../models/Activity');

/**
 * Service class for handling activity-related business logic
 */
class ActivityService {
  /**
   * Get paginated activities for a user
   * @param {number} userId - User ID to get activities for
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum number of activities to return
   * @param {string} [options.cursor] - Cursor for pagination
   * @param {string} [options.event_type] - Filter by event type
   * @returns {Promise<Object>} Object containing activities and pagination info
   */
  static async getUserActivities(userId, options = {}) {
    const { limit = 20, cursor, event_type } = options;
    
    try {
      const activities = await Activity.findByUserId(userId, {
        limit: limit + 1, // Get one extra to check if there are more
        cursor,
        event_type
      });

      const hasMore = activities.length > limit;
      const items = hasMore ? activities.slice(0, limit) : activities;
      
      const result = {
        data: items,
        pagination: {
          limit,
          has_more: hasMore
        }
      };

      // Add next cursor if there are more items
      if (hasMore && items.length > 0) {
        result.pagination.next_cursor = items[items.length - 1].cursor;
      }

      // Add current cursor if provided
      if (cursor) {
        result.pagination.cursor = cursor;
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to fetch user activities: ${error.message}`);
    }
  }
}

module.exports = { ActivityService };