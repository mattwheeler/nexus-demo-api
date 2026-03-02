'use strict';
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../../demo.db'));

/**
 * Service for managing activity events
 * Provides methods for retrieving, creating, and managing user activity data
 */
class ActivityService {
  /**
   * Get activity events for a specific user with pagination and filtering
   * @param {number} userId - User ID to get activities for
   * @param {Object} options - Query options
   * @param {number} [options.limit=20] - Maximum number of events to return
   * @param {string} [options.cursor] - ISO timestamp cursor for pagination
   * @param {string} [options.eventType] - Filter by event type
   * @returns {Promise<Object>} Activity events with pagination info
   */
  static async getActivities(userId, options = {}) {
    const { limit = 20, cursor, eventType } = options;
    
    let query = `
      SELECT id, user_id as userId, type, description, created_at as createdAt
      FROM activity_events 
      WHERE user_id = ?
    `;
    
    const params = [userId];
    
    // Add event type filter if provided
    if (eventType) {
      query += ' AND type = ?';
      params.push(eventType);
    }
    
    // Add cursor-based pagination
    if (cursor) {
      query += ' AND created_at < ?';
      params.push(cursor);
    }
    
    // Order by created_at DESC for newest first
    query += ' ORDER BY created_at DESC';
    
    // Add limit + 1 to check if there are more results
    query += ' LIMIT ?';
    params.push(limit + 1);
    
    const events = db.prepare(query).all(...params);
    
    // Check if there are more results
    const hasMore = events.length > limit;
    if (hasMore) {
      events.pop(); // Remove the extra record
    }
    
    // Generate next cursor from the last event's timestamp
    const nextCursor = hasMore && events.length > 0 ? events[events.length - 1].createdAt : null;
    
    return {
      success: true,
      events,
      pagination: {
        hasMore,
        nextCursor,
        limit
      }
    };
  }
  
  /**
   * Create a new activity event for a user
   * @param {number} userId - User ID
   * @param {Object} eventData - Event data
   * @param {string} eventData.eventType - Type of event
   * @param {string} [eventData.timestamp] - ISO timestamp (defaults to now)
   * @param {Object} [eventData.metadata] - Additional event metadata
   * @returns {Promise<Object>} Created activity event
   */
  static async createActivity(userId, eventData) {
    const { eventType, timestamp = new Date().toISOString(), metadata } = eventData;
    
    const stmt = db.prepare(`
      INSERT INTO activity_events (user_id, type, description, created_at)
      VALUES (?, ?, ?, ?)
    `);
    
    const result = stmt.run(userId, eventType, timestamp, timestamp);
    
    // Return the created event
    const createdEvent = db.prepare(`
      SELECT id, user_id as userId, type, description, created_at as createdAt
      FROM activity_events 
      WHERE id = ?
    `).get(result.lastInsertRowid);
    
    return {
      success: true,
      event: createdEvent
    };
  }
  
  /**
   * Get activity statistics for a user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Activity statistics
   */
  static async getActivityStats(userId) {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as totalEvents,
        COUNT(DISTINCT type) as uniqueEventTypes,
        MIN(created_at) as firstActivity,
        MAX(created_at) as lastActivity
      FROM activity_events 
      WHERE user_id = ?
    `).get(userId);
    
    const eventTypeCounts = db.prepare(`
      SELECT type, COUNT(*) as count
      FROM activity_events 
      WHERE user_id = ?
      GROUP BY type
      ORDER BY count DESC
    `).all(userId);
    
    return {
      success: true,
      stats: {
        ...stats,
        eventTypeCounts
      }
    };
  }
}

module.exports = ActivityService;
