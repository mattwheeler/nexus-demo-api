'use strict';
const { Activity } = require('../models/Activity');

/**
 * Service class for handling activity-related business logic
 */
class ActivityService {
  /**
   * Retrieves activities for a specific user with cursor-based pagination
   * @param {Object} params - Parameters for retrieving activities
   * @param {number} params.userId - The ID of the user whose activities to retrieve
   * @param {string} [params.cursor] - Cursor for pagination (optional)
   * @param {number} [params.limit=10] - Number of activities to retrieve (defaults to 10)
   * @returns {Promise<Object>} Object containing activities, nextCursor, and hasPrevious
   */
  static async getUserActivities({ userId, cursor, limit = 10 }) {
    try {
      // Validate input parameters
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Ensure limit is within reasonable bounds
      const sanitizedLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
      
      // Get activities with one extra to check if there are more results
      const activities = await Activity.findByUserId(userId, {
        cursor,
        limit: sanitizedLimit + 1,
        orderBy: 'timestamp',
        direction: 'DESC'
      });

      // Handle case where user has no activities
      if (!activities || activities.length === 0) {
        return {
          activities: [],
          nextCursor: null,
          hasPrevious: !!cursor
        };
      }

      // Check if there are more results available
      const hasMore = activities.length > sanitizedLimit;
      const returnedActivities = hasMore ? activities.slice(0, sanitizedLimit) : activities;

      // Generate next cursor if there are more results
      let nextCursor = null;
      if (hasMore) {
        const lastActivity = returnedActivities[returnedActivities.length - 1];
        nextCursor = lastActivity.cursor;
      }

      return {
        activities: returnedActivities,
        nextCursor,
        hasPrevious: !!cursor
      };
    } catch (error) {
      // Re-throw with more context for debugging
      throw new Error(`Failed to retrieve user activities: ${error.message}`);
    }
  }

  /**
   * Retrieves a single page of activities with metadata about pagination state
   * @param {Object} params - Parameters for pagination
   * @param {number} params.userId - The ID of the user whose activities to retrieve
   * @param {string} [params.cursor] - Cursor for pagination
   * @param {number} [params.limit=10] - Number of activities per page
   * @returns {Promise<Object>} Paginated result with metadata
   */
  static async getPaginatedActivities({ userId, cursor, limit = 10 }) {
    const result = await this.getUserActivities({ userId, cursor, limit });
    
    return {
      data: result.activities,
      pagination: {
        nextCursor: result.nextCursor,
        hasPrevious: result.hasPrevious,
        hasNext: !!result.nextCursor,
        limit: Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100)
      },
      meta: {
        total: result.activities.length,
        userId: parseInt(userId, 10)
      }
    };
  }

  /**
   * Validates if a cursor is valid for a given user
   * @param {number} userId - The user ID
   * @param {string} cursor - The cursor to validate
   * @returns {Promise<boolean>} True if cursor is valid, false otherwise
   */
  static async isValidCursor(userId, cursor) {
    try {
      if (!cursor || !userId) {
        return false;
      }

      const activity = await Activity.findByCursor(cursor);
      return activity && activity.user_id === parseInt(userId, 10);
    } catch (error) {
      // If there's an error checking the cursor, consider it invalid
      return false;
    }
  }

  /**
   * Gets the first cursor for a user's activities (used for starting pagination)
   * @param {number} userId - The user ID
   * @returns {Promise<string|null>} The first cursor or null if no activities
   */
  static async getFirstCursor(userId) {
    try {
      const activities = await Activity.findByUserId(userId, {
        limit: 1,
        orderBy: 'timestamp',
        direction: 'DESC'
      });

      return activities && activities.length > 0 ? activities[0].cursor : null;
    } catch (error) {
      throw new Error(`Failed to get first cursor: ${error.message}`);
    }
  }

  /**
   * Gets activity count for a user
   * @param {number} userId - The user ID
   * @returns {Promise<number>} Number of activities for the user
   */
  static async getActivityCount(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      return await Activity.countByUserId(userId);
    } catch (error) {
      throw new Error(`Failed to get activity count: ${error.message}`);
    }
  }
}

module.exports = { ActivityService };