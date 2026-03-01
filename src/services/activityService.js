'use strict';
const { UserNotFoundError, InvalidCursorError, DatabaseError } = require('../errors/AppError');
const { getUser } = require('../models/User');
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../../demo.db'));

/**
 * Activity service with comprehensive error handling
 */
class ActivityService {
  /**
   * Get user activity with pagination
   * @param {string|number} userId - User ID
   * @param {Object} options - Pagination options
   * @param {string} [options.cursor] - Pagination cursor
   * @param {number} [options.limit=20] - Number of items per page
   * @returns {Promise<Object>} Activity data with pagination info
   * @throws {UserNotFoundError} When user doesn't exist
   * @throws {InvalidCursorError} When cursor is invalid
   * @throws {DatabaseError} When database operation fails
   */
  async getUserActivity(userId, { cursor, limit = 20 } = {}) {
    try {
      // Validate user exists
      const user = await getUser(userId);
      if (!user) {
        throw new UserNotFoundError(userId);
      }

      // Validate and parse cursor
      let cursorId = null;
      if (cursor) {
        cursorId = this._parseCursor(cursor);
      }

      // Validate limit
      const parsedLimit = this._validateLimit(limit);

      // Get activities with error handling
      const activities = await this._getActivitiesFromDb(userId, cursorId, parsedLimit);
      
      // Generate pagination info
      const pagination = this._generatePagination(activities, parsedLimit);

      return {
        activities: activities.slice(0, parsedLimit), // Remove extra item used for hasNext check
        pagination,
        user: {
          id: user.id,
          name: user.name
        }
      };
    } catch (error) {
      // Re-throw known errors
      if (error instanceof UserNotFoundError || 
          error instanceof InvalidCursorError || 
          error instanceof DatabaseError) {
        throw error;
      }
      
      // Wrap unexpected errors
      throw new DatabaseError('Failed to fetch user activity', error);
    }
  }

  /**
   * Parse and validate cursor
   * @private
   * @param {string} cursor - Base64 encoded cursor
   * @returns {number} Parsed cursor ID
   * @throws {InvalidCursorError} When cursor is invalid
   */
  _parseCursor(cursor) {
    try {
      const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
      const cursorId = parseInt(decoded, 10);
      
      if (isNaN(cursorId) || cursorId <= 0) {
        throw new InvalidCursorError(cursor);
      }
      
      return cursorId;
    } catch (error) {
      if (error instanceof InvalidCursorError) {
        throw error;
      }
      throw new InvalidCursorError(cursor);
    }
  }

  /**
   * Validate limit parameter
   * @private
   * @param {number|string} limit - Limit value
   * @returns {number} Validated limit
   */
  _validateLimit(limit) {
    const parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 100) {
      return 20; // Default limit
    }
    return parsedLimit;
  }

  /**
   * Get activities from database with error handling
   * @private
   * @param {number} userId - User ID
   * @param {number|null} cursorId - Cursor ID
   * @param {number} limit - Limit
   * @returns {Promise<Array>} Activities
   * @throws {DatabaseError} When database operation fails
   */
  async _getActivitiesFromDb(userId, cursorId, limit) {
    try {
      let query = `
        SELECT id, type, description, created_at 
        FROM activity_events 
        WHERE user_id = ?
      `;
      let params = [userId];

      if (cursorId) {
        query += ' AND id < ?';
        params.push(cursorId);
      }

      query += ' ORDER BY id DESC LIMIT ?';
      params.push(limit + 1); // Get one extra to check if there are more

      const stmt = db.prepare(query);
      const activities = stmt.all(...params);
      
      return Promise.resolve(activities);
    } catch (error) {
      throw new DatabaseError('Failed to query activity events', error);
    }
  }

  /**
   * Generate pagination information
   * @private
   * @param {Array} activities - Activities array
   * @param {number} limit - Original limit
   * @returns {Object} Pagination info
   */
  _generatePagination(activities, limit) {
    const hasNext = activities.length > limit;
    const nextCursor = hasNext && activities.length > 0 
      ? Buffer.from(activities[limit - 1].id.toString()).toString('base64')
      : null;

    return {
      hasNext,
      nextCursor,
      limit
    };
  }
}

module.exports = { ActivityService };