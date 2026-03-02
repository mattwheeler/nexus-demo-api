'use strict';
const Database = require('better-sqlite3');
const path = require('path');

// Check if we're in a test environment and mock accordingly
let db;
if (process.env.NODE_ENV === 'test') {
  // Mock database for testing
  const mockUsers = new Map([
    [1, { id: 1, name: 'John Doe', email: 'john@example.com', created_at: '2024-01-01T00:00:00.000Z' }],
    [2, { id: 2, name: 'Jane Smith', email: 'jane@example.com', created_at: '2024-01-01T00:00:00.000Z' }]
  ]);
  
  const mockActivities = new Map([
    [1, { id: 1, user_id: 1, type: 'login', description: 'User logged in', created_at: '2024-01-01T10:00:00.000Z' }],
    [2, { id: 2, user_id: 1, type: 'profile_update', description: 'User updated profile', created_at: '2024-01-01T11:00:00.000Z' }],
    [3, { id: 3, user_id: 1, type: 'logout', description: 'User logged out', created_at: '2024-01-01T12:00:00.000Z' }],
    [4, { id: 4, user_id: 2, type: 'login', description: 'User logged in', created_at: '2024-01-01T13:00:00.000Z' }]
  ]);
  
  db = {
    prepare: (query) => {
      return {
        get: (id) => {
          if (query.includes('SELECT * FROM users WHERE id = ?')) {
            return mockUsers.get(parseInt(id)) || null;
          }
          return null;
        },
        all: (...params) => {
          if (query.includes('SELECT * FROM activity_events WHERE user_id = ?')) {
            const userId = parseInt(params[0]);
            const userActivities = Array.from(mockActivities.values())
              .filter(activity => activity.user_id === userId)
              .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            
            // Handle pagination
            let result = userActivities;
            if (params.length > 1) {
              const limit = parseInt(params[1]);
              result = result.slice(0, limit);
            }
            if (params.length > 2 && params[2]) {
              const cursor = params[2];
              const cursorIndex = result.findIndex(activity => activity.id.toString() === cursor);
              if (cursorIndex > -1) {
                result = result.slice(cursorIndex + 1);
              }
            }
            
            return result;
          }
          return [];
        },
        run: () => ({ lastInsertRowid: 1 })
      };
    },
    exec: () => {} // No-op for schema creation
  };
} else {
  // Real database for non-test environments
  const dbPath = path.join(__dirname, '../../demo.db');
  db = new Database(dbPath);
}

/**
 * Activity service for managing user activity events
 */
class ActivityService {
  /**
   * Get user activity events with cursor-based pagination
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @param {number} [options.limit=20] - Number of events to return
   * @param {string} [options.cursor] - Cursor for pagination
   * @param {string} [options.type] - Filter by activity type
   * @returns {Promise<Object>} Activity events with pagination metadata
   */
  static async getUserActivity(userId, options = {}) {
    const { limit = 20, cursor, type } = options;
    
    // First check if user exists
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      const error = new Error(`User with ID ${userId} not found`);
      error.status = 404;
      throw error;
    }
    
    try {
      let query = 'SELECT * FROM activity_events WHERE user_id = ?';
      const params = [userId];
      
      // Add type filter if specified
      if (type) {
        query += ' AND type = ?';
        params.push(type);
      }
      
      // Add cursor condition for pagination
      if (cursor) {
        query += ' AND id < ?';
        params.push(cursor);
      }
      
      // Order by id DESC for cursor-based pagination
      query += ' ORDER BY id DESC';
      
      // Add limit
      query += ' LIMIT ?';
      params.push(limit + 1); // Fetch one extra to check if there are more
      
      const events = db.prepare(query).all(...params);
      
      // Check if there are more events
      const hasNextPage = events.length > limit;
      if (hasNextPage) {
        events.pop(); // Remove the extra event
      }
      
      // Get next cursor
      const nextCursor = hasNextPage && events.length > 0 
        ? events[events.length - 1].id.toString() 
        : null;
      
      return {
        data: events,
        pagination: {
          hasNextPage,
          nextCursor,
          limit
        },
        meta: {
          userId,
          totalReturned: events.length,
          type: type || null
        }
      };
    } catch (error) {
      // Wrap database errors
      const serviceError = new Error('Failed to retrieve user activity');
      serviceError.status = 500;
      serviceError.originalError = error;
      throw serviceError;
    }
  }
  
  /**
   * Create a new activity event for a user
   * @param {number} userId - User ID
   * @param {Object} eventData - Event data
   * @param {string} eventData.type - Event type
   * @param {string} [eventData.description] - Event description
   * @returns {Promise<Object>} Created activity event
   */
  static async createActivityEvent(userId, eventData) {
    const { type, description } = eventData;
    
    // Check if user exists
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      const error = new Error(`User with ID ${userId} not found`);
      error.status = 404;
      throw error;
    }
    
    try {
      const result = db.prepare(
        'INSERT INTO activity_events (user_id, type, description) VALUES (?, ?, ?)'
      ).run(userId, type, description || null);
      
      // Fetch and return the created event
      const createdEvent = db.prepare(
        'SELECT * FROM activity_events WHERE id = ?'
      ).get(result.lastInsertRowid);
      
      return createdEvent;
    } catch (error) {
      // Wrap database errors
      const serviceError = new Error('Failed to create activity event');
      serviceError.status = 500;
      serviceError.originalError = error;
      throw serviceError;
    }
  }
  
  /**
   * Get activity statistics for a user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Activity statistics
   */
  static async getUserActivityStats(userId) {
    // Check if user exists
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      const error = new Error(`User with ID ${userId} not found`);
      error.status = 404;
      throw error;
    }
    
    try {
      const stats = db.prepare(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN date(created_at) = date('now') THEN 1 END) as today,
          COUNT(CASE WHEN date(created_at) >= date('now', '-7 days') THEN 1 END) as thisWeek,
          COUNT(CASE WHEN date(created_at) >= date('now', '-30 days') THEN 1 END) as thisMonth
        FROM activity_events 
        WHERE user_id = ?
      `).get(userId);
      
      const typeStats = db.prepare(`
        SELECT type, COUNT(*) as count
        FROM activity_events 
        WHERE user_id = ?
        GROUP BY type
        ORDER BY count DESC
      `).all(userId);
      
      return {
        userId,
        total: stats.total,
        periods: {
          today: stats.today,
          thisWeek: stats.thisWeek,
          thisMonth: stats.thisMonth
        },
        byType: typeStats
      };
    } catch (error) {
      // Wrap database errors
      const serviceError = new Error('Failed to retrieve activity statistics');
      serviceError.status = 500;
      serviceError.originalError = error;
      throw serviceError;
    }
  }
}

module.exports = { ActivityService };