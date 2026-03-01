'use strict';
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../../demo.db'));

/**
 * Activity service for managing user activity events
 */
class ActivityService {
  /**
   * Get paginated activity events for a user
   * 
   * @param {number|string} userId - User ID
   * @param {Object} options - Pagination options
   * @param {number} options.limit - Number of events to return (default: 10, max: 50)
   * @param {string|null} options.cursor - Pagination cursor for next page
   * @returns {Promise<Object>} Paginated activity events with metadata
   */
  async getUserActivity(userId, { limit = 10, cursor = null } = {}) {
    let query = `
      SELECT id, user_id, type, description, created_at
      FROM activity_events
      WHERE user_id = ?
    `;
    
    const params = [userId];
    
    // Handle cursor-based pagination
    if (cursor) {
      try {
        const decodedCursor = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
        if (decodedCursor.id) {
          query += ' AND id < ?';
          params.push(decodedCursor.id);
        }
      } catch (error) {
        throw new Error('Invalid cursor format');
      }
    }
    
    query += ' ORDER BY created_at DESC, id DESC LIMIT ?';
    params.push(limit + 1); // Fetch one extra to determine if there are more pages
    
    const events = db.prepare(query).all(...params);
    
    const hasMore = events.length > limit;
    if (hasMore) {
      events.pop(); // Remove the extra event
    }
    
    // Generate next cursor if there are more events
    let nextCursor = null;
    if (hasMore && events.length > 0) {
      const lastEvent = events[events.length - 1];
      nextCursor = Buffer.from(JSON.stringify({ id: lastEvent.id })).toString('base64');
    }
    
    return {
      events,
      pagination: {
        limit,
        hasMore,
        nextCursor
      }
    };
  }
  
  /**
   * Create a new activity event for a user
   * 
   * @param {number|string} userId - User ID
   * @param {Object} eventData - Event data
   * @param {string} eventData.type - Event type
   * @param {string} [eventData.description] - Event description
   * @returns {Promise<Object>} Created activity event
   */
  async createActivity(userId, { type, description = null }) {
    const result = db.prepare(`
      INSERT INTO activity_events (user_id, type, description)
      VALUES (?, ?, ?)
    `).run(userId, type, description);
    
    return db.prepare(`
      SELECT id, user_id, type, description, created_at
      FROM activity_events
      WHERE id = ?
    `).get(result.lastInsertRowid);
  }
}

// Singleton instance
let activityServiceInstance = null;

/**
 * Get the activity service instance (singleton)
 * 
 * @returns {ActivityService} Activity service instance
 */
function getActivityService() {
  if (!activityServiceInstance) {
    activityServiceInstance = new ActivityService();
  }
  return activityServiceInstance;
}

module.exports = {
  ActivityService,
  getActivityService
};