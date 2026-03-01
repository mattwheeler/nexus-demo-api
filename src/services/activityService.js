'use strict';
const { v4: uuidv4 } = require('uuid');
const { ACTIVITY_TYPES } = require('../types/activity');

/**
 * Activity service for managing user activity events
 */
class ActivityService {
  constructor() {
    // In-memory storage for demo purposes
    // In production, this would use a database
    this.activities = new Map();
    this.userActivities = new Map(); // userId -> Set of activity IDs
  }

  /**
   * Create a new activity event
   * @param {Object} activityData - Activity event data
   * @param {string} activityData.userId - User ID
   * @param {string} activityData.type - Activity type
   * @param {string} activityData.description - Activity description
   * @param {Object} [activityData.metadata] - Additional metadata
   * @returns {Promise<Object>} Created activity event
   */
  async createActivity({ userId, type, description, metadata = {} }) {
    const id = uuidv4();
    const timestamp = new Date().toISOString();
    
    const activity = {
      id,
      userId,
      type,
      description,
      timestamp,
      metadata
    };
    
    this.activities.set(id, activity);
    
    // Add to user's activity list
    if (!this.userActivities.has(userId)) {
      this.userActivities.set(userId, new Set());
    }
    this.userActivities.get(userId).add(id);
    
    return activity;
  }

  /**
   * Get activities with pagination and filtering
   * @param {Object} options - Query options
   * @param {string} [options.userId] - Filter by user ID
   * @param {string} [options.type] - Filter by activity type
   * @param {number} [options.limit=20] - Maximum results per page
   * @param {string} [options.cursor] - Pagination cursor
   * @param {string} [options.startDate] - Start date filter
   * @param {string} [options.endDate] - End date filter
   * @returns {Promise<Object>} Paginated activity results
   */
  async getActivities({
    userId,
    type,
    limit = 20,
    cursor,
    startDate,
    endDate
  } = {}) {
    let activities = Array.from(this.activities.values());
    
    // Apply filters
    if (userId) {
      activities = activities.filter(a => a.userId === userId);
    }
    
    if (type) {
      activities = activities.filter(a => a.type === type);
    }
    
    if (startDate) {
      const start = new Date(startDate);
      activities = activities.filter(a => new Date(a.timestamp) >= start);
    }
    
    if (endDate) {
      const end = new Date(endDate);
      activities = activities.filter(a => new Date(a.timestamp) <= end);
    }
    
    // Sort by timestamp (newest first)
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Apply cursor-based pagination
    let startIndex = 0;
    if (cursor) {
      const cursorActivity = activities.find(a => a.id === cursor);
      if (cursorActivity) {
        startIndex = activities.indexOf(cursorActivity) + 1;
      }
    }
    
    const paginatedActivities = activities.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < activities.length;
    const nextCursor = hasMore && paginatedActivities.length > 0 
      ? paginatedActivities[paginatedActivities.length - 1].id 
      : undefined;
    
    return {
      data: paginatedActivities,
      pagination: {
        hasMore,
        nextCursor,
        total: activities.length
      }
    };
  }

  /**
   * Get a single activity by ID
   * @param {string} id - Activity ID
   * @returns {Promise<Object|null>} Activity event or null if not found
   */
  async getActivity(id) {
    return this.activities.get(id) || null;
  }

  /**
   * Delete an activity event
   * @param {string} id - Activity ID
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async deleteActivity(id) {
    const activity = this.activities.get(id);
    if (!activity) {
      return false;
    }
    
    this.activities.delete(id);
    
    // Remove from user's activity list
    const userActivities = this.userActivities.get(activity.userId);
    if (userActivities) {
      userActivities.delete(id);
    }
    
    return true;
  }

  /**
   * Get activity count for a user
   * @param {string} userId - User ID
   * @returns {Promise<number>} Number of activities for the user
   */
  async getUserActivityCount(userId) {
    const userActivitySet = this.userActivities.get(userId);
    return userActivitySet ? userActivitySet.size : 0;
  }

  /**
   * Clear all activities (for testing)
   * @returns {Promise<void>}
   */
  async clearAllActivities() {
    this.activities.clear();
    this.userActivities.clear();
  }
}

// Export singleton instance
const activityService = new ActivityService();
module.exports = { activityService, ActivityService };