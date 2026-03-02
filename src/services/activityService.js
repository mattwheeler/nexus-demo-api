'use strict';
const { getDatabase } = require('../models/database');
const { getUser } = require('../models/User');

/**
 * Activity service for managing user activity events
 * Provides methods for retrieving, creating, and managing activity data
 */
class ActivityService {
  /**
   * Get activity events for a user with cursor-based pagination
   * @param {number} userId - User ID to get activities for
   * @param {Object} options - Query options
   * @param {number} [options.limit=50] - Maximum number of events to return
   * @param {string} [options.cursor] - Cursor for pagination (base64 encoded timestamp)
   * @param {string} [options.type] - Filter by event type
   * @returns {Promise<Object>} Activity response with events and pagination info
   */
  static async getActivity(userId, options = {}) {
    const { limit = 50, cursor, type } = options;
    
    // Verify user exists first
    const user = await getUser(userId);
    if (!user) {
      const error = new Error(`User with ID ${userId} not found`);
      error.status = 404;
      throw error;
    }
    
    const db = getDatabase();
    
    // Build the query
    let query = `
      SELECT id, user_id, type, description, created_at
      FROM activity_events
      WHERE user_id = ?
    `;
    const params = [userId];
    
    // Add type filter if specified
    if (type) {
      query += ` AND type = ?`;
      params.push(type);
    }
    
    // Add cursor-based pagination
    if (cursor) {
      try {
        const decodedCursor = Buffer.from(cursor, 'base64').toString('utf-8');
        const cursorDate = new Date(decodedCursor).toISOString();
        query += ` AND created_at < ?`;
        params.push(cursorDate);
      } catch (err) {
        const error = new Error('Invalid cursor format');
        error.status = 400;
        throw error;
      }
    }
    
    // Order by created_at DESC and limit
    query += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(limit + 1); // Get one extra to check if there are more results
    
    const stmt = db.prepare(query);
    const events = stmt.all(...params);
    
    // Check if there are more results
    const hasMore = events.length > limit;
    if (hasMore) {
      events.pop(); // Remove the extra event
    }
    
    // Generate next cursor from the last event
    let nextCursor = null;
    if (hasMore && events.length > 0) {
      const lastEvent = events[events.length - 1];
      nextCursor = Buffer.from(lastEvent.created_at).toString('base64');
    }
    
    // Format response
    return {
      events: events.map(event => ({
        id: event.id,
        userId: event.user_id,
        type: event.type,
        description: event.description,
        createdAt: event.created_at
      })),
      pagination: {
        limit,
        cursor,
        nextCursor,
        hasMore
      }
    };
  }
  
  /**
   * Create a new activity event for a user
   * @param {number} userId - User ID to create activity for
   * @param {Object} eventData - Event data
   * @param {string} eventData.type - Event type
   * @param {string} [eventData.description] - Event description
   * @returns {Promise<Object>} Created activity event
   */
  static async createActivity(userId, eventData) {
    const { type, description } = eventData;
    
    // Verify user exists first
    const user = await getUser(userId);
    if (!user) {
      const error = new Error(`User with ID ${userId} not found`);
      error.status = 404;
      throw error;
    }
    
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO activity_events (user_id, type, description)
      VALUES (?, ?, ?)
    `);
    
    const result = stmt.run(userId, type, description || null);
    
    // Return the created event
    const createdEvent = db.prepare(`
      SELECT id, user_id, type, description, created_at
      FROM activity_events
      WHERE id = ?
    `).get(result.lastInsertRowid);
    
    return {
      id: createdEvent.id,
      userId: createdEvent.user_id,
      type: createdEvent.type,
      description: createdEvent.description,
      createdAt: createdEvent.created_at
    };
  }
}

/**
 * Get activity events for a user (convenience function)
 * @param {number} userId - User ID to get activities for
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Activity response
 */
async function getActivity(userId, options = {}) {
  return ActivityService.getActivity(userId, options);
}

/**
 * Create activity event for a user (convenience function)
 * @param {number} userId - User ID to create activity for
 * @param {Object} eventData - Event data
 * @returns {Promise<Object>} Created activity event
 */
async function createActivity(userId, eventData) {
  return ActivityService.createActivity(userId, eventData);
}

module.exports = {
  ActivityService,
  getActivity,
  createActivity
};