'use strict';
const { getActivityEventsByUser } = require('../models/ActivityEvent');
const { getUser } = require('../models/User');

/**
 * Service for handling activity events with cursor-based pagination
 */
class ActivityService {
  /**
   * Fetch user activity events with cursor-based pagination
   * @param {number} userId - The user ID to fetch activities for
   * @param {Object} options - Pagination and filtering options
   * @param {string} [options.cursor] - Cursor for pagination (ISO timestamp)
   * @param {number} [options.limit=20] - Maximum number of events to return (1-100)
   * @param {string} [options.eventType] - Filter by specific event type
   * @returns {Promise<Object>} Paginated activity results
   * @throws {Error} If user not found or invalid parameters
   */
  static async getUserActivities(userId, options = {}) {
    try {
      // Validate and set defaults
      const { cursor, limit = 20, eventType } = options;
      
      // Validate limit range
      if (limit < 1 || limit > 100) {
        const error = new Error('Limit must be between 1 and 100');
        error.status = 400;
        throw error;
      }
      
      // Validate cursor format if provided
      if (cursor && !this._isValidTimestamp(cursor)) {
        const error = new Error('Invalid cursor format. Must be a valid ISO datetime string');
        error.status = 400;
        throw error;
      }
      
      // Verify user exists
      const user = await getUser(userId);
      if (!user) {
        const error = new Error(`User with ID ${userId} not found`);
        error.status = 404;
        throw error;
      }
      
      // Fetch activities from the model layer
      const result = await getActivityEventsByUser(userId, {
        cursor,
        limit,
        eventType
      });
      
      // Handle empty results
      if (!result.events || result.events.length === 0) {
        return {
          events: [],
          pagination: {
            hasMore: false,
            nextCursor: null,
            limit
          },
          metadata: {
            totalReturned: 0,
            requestedAt: new Date().toISOString()
          }
        };
      }
      
      // Format the response with enhanced pagination info
      return {
        events: result.events,
        pagination: {
          hasMore: result.hasMore,
          nextCursor: result.nextCursor,
          limit,
          cursor: cursor || null
        },
        metadata: {
          totalReturned: result.events.length,
          requestedAt: new Date().toISOString(),
          filters: eventType ? { eventType } : {}
        }
      };
      
    } catch (error) {
      // Re-throw known errors with status codes
      if (error.status) {
        throw error;
      }
      
      // Handle unexpected database or system errors
      console.error('ActivityService.getUserActivities error:', error);
      const serviceError = new Error('Failed to retrieve user activities');
      serviceError.status = 500;
      serviceError.originalError = error;
      throw serviceError;
    }
  }
  
  /**
   * Get activity statistics for a user
   * @param {number} userId - The user ID
   * @param {Object} options - Options for statistics
   * @param {string} [options.startDate] - Start date for statistics (ISO string)
   * @param {string} [options.endDate] - End date for statistics (ISO string)
   * @returns {Promise<Object>} Activity statistics
   * @throws {Error} If user not found or invalid parameters
   */
  static async getUserActivityStats(userId, options = {}) {
    try {
      const { startDate, endDate } = options;
      
      // Validate date formats if provided
      if (startDate && !this._isValidTimestamp(startDate)) {
        const error = new Error('Invalid startDate format. Must be a valid ISO datetime string');
        error.status = 400;
        throw error;
      }
      
      if (endDate && !this._isValidTimestamp(endDate)) {
        const error = new Error('Invalid endDate format. Must be a valid ISO datetime string');
        error.status = 400;
        throw error;
      }
      
      // Verify user exists
      const user = await getUser(userId);
      if (!user) {
        const error = new Error(`User with ID ${userId} not found`);
        error.status = 404;
        throw error;
      }
      
      // Import the stats function from the model (it exists in ActivityEvent.js)
      const { getActivityEventStats } = require('../models/ActivityEvent');
      
      const stats = await getActivityEventStats(userId, {
        startDate,
        endDate
      });
      
      return {
        ...stats,
        metadata: {
          userId,
          dateRange: {
            startDate: startDate || null,
            endDate: endDate || null
          },
          generatedAt: new Date().toISOString()
        }
      };
      
    } catch (error) {
      // Re-throw known errors with status codes
      if (error.status) {
        throw error;
      }
      
      // Handle unexpected errors
      console.error('ActivityService.getUserActivityStats error:', error);
      const serviceError = new Error('Failed to retrieve activity statistics');
      serviceError.status = 500;
      serviceError.originalError = error;
      throw serviceError;
    }
  }
  
  /**
   * Validate if a string is a valid ISO timestamp
   * @private
   * @param {string} timestamp - Timestamp to validate
   * @returns {boolean} True if valid ISO timestamp
   */
  static _isValidTimestamp(timestamp) {
    if (typeof timestamp !== 'string') return false;
    
    try {
      const date = new Date(timestamp);
      return date.toISOString() === timestamp;
    } catch {
      return false;
    }
  }
  
  /**
   * Get the next cursor for pagination
   * @param {Array} events - Array of events
   * @returns {string|null} Next cursor or null if no more events
   */
  static _getNextCursor(events) {
    if (!events || events.length === 0) {
      return null;
    }
    
    const lastEvent = events[events.length - 1];
    return lastEvent.timestamp;
  }
  
  /**
   * Validate pagination parameters
   * @private
   * @param {Object} options - Pagination options
   * @param {string} [options.cursor] - Cursor for pagination
   * @param {number} [options.limit] - Limit for pagination
   * @throws {Error} If parameters are invalid
   */
  static _validatePaginationParams(options) {
    const { cursor, limit } = options;
    
    if (cursor !== undefined && !this._isValidTimestamp(cursor)) {
      const error = new Error('Invalid cursor format. Must be a valid ISO datetime string');
      error.status = 400;
      throw error;
    }
    
    if (limit !== undefined && (typeof limit !== 'number' || limit < 1 || limit > 100)) {
      const error = new Error('Limit must be a number between 1 and 100');
      error.status = 400;
      throw error;
    }
  }
}

module.exports = { ActivityService };