'use strict';
const Database = require('better-sqlite3');
const path = require('path');
const { NotFoundError, DatabaseError } = require('../middleware/errorHandler');

const db = new Database(path.join(__dirname, '../../demo.db'));

// Ensure activities table exists with proper schema
db.exec(`
  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    metadata TEXT,
    cursor TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

/**
 * Generates a cursor for pagination
 * @param {number} id - Activity ID
 * @param {string} timestamp - Activity timestamp
 * @returns {string} Base64 encoded cursor
 */
function generateCursor(id, timestamp) {
  const cursorData = JSON.stringify({ id, timestamp });
  return Buffer.from(cursorData).toString('base64');
}

/**
 * Parses a cursor for pagination
 * @param {string} cursor - Base64 encoded cursor
 * @returns {Object} Parsed cursor data
 */
function parseCursor(cursor) {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch (err) {
    throw new Error('Invalid cursor format');
  }
}

class ActivityService {
  /**
   * Get user activities with pagination
   * @param {number} userId - User ID
   * @param {Object} options - Pagination options
   * @param {number} options.limit - Number of activities to return
   * @param {string} options.cursor - Cursor for pagination
   * @param {string} options.order - Sort order (asc or desc)
   * @returns {Promise<Object>} Activities and pagination info
   */
  static async getUserActivities(userId, options = {}) {
    const { limit = 10, cursor, order = 'desc' } = options;
    
    // Check if user exists
    const userExists = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!userExists) {
      throw new NotFoundError('User not found');
    }

    let query = 'SELECT * FROM activities WHERE user_id = ?';
    let params = [userId];
    
    // Handle cursor-based pagination
    if (cursor) {
      const { id: cursorId, timestamp: cursorTimestamp } = parseCursor(cursor);
      
      if (order === 'desc') {
        query += ' AND (timestamp < ? OR (timestamp = ? AND id < ?))';
        params.push(cursorTimestamp, cursorTimestamp, cursorId);
      } else {
        query += ' AND (timestamp > ? OR (timestamp = ? AND id > ?))';
        params.push(cursorTimestamp, cursorTimestamp, cursorId);
      }
    }
    
    // Add ordering
    query += ` ORDER BY timestamp ${order.toUpperCase()}, id ${order.toUpperCase()}`;
    
    // Add limit + 1 to check if there are more results
    query += ' LIMIT ?';
    params.push(limit + 1);
    
    try {
      const activities = db.prepare(query).all(...params);
      
      // Check if there are more results
      const hasMore = activities.length > limit;
      if (hasMore) {
        activities.pop(); // Remove the extra result
      }
      
      // Generate next cursor
      let nextCursor = null;
      if (hasMore && activities.length > 0) {
        const lastActivity = activities[activities.length - 1];
        nextCursor = generateCursor(lastActivity.id, lastActivity.timestamp);
      }
      
      // Parse metadata for each activity
      const processedActivities = activities.map(activity => ({
        ...activity,
        metadata: activity.metadata ? JSON.parse(activity.metadata) : null
      }));
      
      return {
        data: processedActivities,
        pagination: {
          hasMore,
          nextCursor,
          limit
        }
      };
    } catch (err) {
      throw new DatabaseError('Failed to retrieve activities');
    }
  }
  
  /**
   * Create a new activity for a user
   * @param {number} userId - User ID
   * @param {Object} activityData - Activity data
   * @param {string} activityData.event_type - Type of activity event
   * @param {string} activityData.timestamp - Activity timestamp
   * @param {Object} activityData.metadata - Activity metadata
   * @returns {Promise<Object>} Created activity
   */
  static async createActivity(userId, activityData) {
    const { event_type, timestamp, metadata } = activityData;
    
    // Check if user exists
    const userExists = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!userExists) {
      throw new NotFoundError('User not found');
    }
    
    const metadataString = metadata ? JSON.stringify(metadata) : null;
    const activityTimestamp = timestamp || new Date().toISOString();
    
    // Prepare statement for inserting activity
    const stmt = db.prepare(`
      INSERT INTO activities (user_id, event_type, timestamp, metadata, cursor) 
      VALUES (?, ?, ?, ?, ?)
    `);
    
    // Generate temporary cursor (will be updated after insert)
    const tempCursor = generateCursor(0, activityTimestamp);
    
    try {
      const result = stmt.run(userId, event_type, activityTimestamp, metadataString, tempCursor);
      
      // Update the cursor with the actual ID
      const actualCursor = generateCursor(result.lastInsertRowid, activityTimestamp);
      db.prepare('UPDATE activities SET cursor = ? WHERE id = ?')
        .run(actualCursor, result.lastInsertRowid);
      
      // Return the created activity
      const activity = db.prepare('SELECT * FROM activities WHERE id = ?')
        .get(result.lastInsertRowid);
      
      return {
        ...activity,
        metadata: activity.metadata ? JSON.parse(activity.metadata) : null
      };
    } catch (err) {
      if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
        throw new NotFoundError('User not found');
      }
      throw new DatabaseError('Failed to create activity');
    }
  }
}

module.exports = { ActivityService, generateCursor, parseCursor };