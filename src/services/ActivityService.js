'use strict';
const { Activity } = require('../models/Activity');
const { getUser } = require('../models/User');
const { NotFoundError, DatabaseError } = require('../middleware/errorHandler');

/**
 * Activity service with pagination and error handling
 */
class ActivityService {
  /**
   * Get user activities with pagination
   * @param {number} userId - User ID
   * @param {Object} options - Pagination options
   * @param {number} options.limit - Number of items per page
   * @param {string} options.cursor - Cursor for pagination
   * @param {string} options.order - Sort order (asc/desc)
   * @returns {Promise<Object>} Activities with pagination info
   */
  static async getUserActivities(userId, options = {}) {
    try {
      // Check if user exists
      const user = await getUser(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      const { limit = 10, cursor, order = 'desc' } = options;

      // Get activities with pagination
      const activities = await Activity.findByUserId(userId, {
        limit: limit + 1, // Get one extra to check if there are more
        cursor,
        order
      });

      // Determine if there are more results
      const hasMore = activities.length > limit;
      const items = hasMore ? activities.slice(0, -1) : activities;

      // Get next cursor from last item
      const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].cursor : null;

      return {
        data: items,
        pagination: {
          limit,
          hasMore,
          nextCursor,
          total: items.length
        }
      };
    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      
      // Handle database errors
      throw new DatabaseError('Failed to retrieve user activities');
    }
  }

  /**
   * Create a new activity for a user
   * @param {number} userId - User ID
   * @param {Object} activityData - Activity data
   * @returns {Promise<Object>} Created activity
   */
  static async createActivity(userId, activityData) {
    try {
      // Check if user exists
      const user = await getUser(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      const activity = await Activity.create({
        user_id: userId,
        ...activityData
      });

      return activity;
    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      
      // Handle database errors
      throw new DatabaseError('Failed to create activity');
    }
  }
}

module.exports = { ActivityService };