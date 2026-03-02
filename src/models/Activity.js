'use strict';
const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const db = new Database(path.join(__dirname, '../../demo.db'));

// Run migration to ensure table exists
const migrationSql = `
-- Create activity table with proper indexes
CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  metadata TEXT,
  cursor TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON activities(timestamp);
CREATE INDEX IF NOT EXISTS idx_activities_cursor ON activities(cursor);
CREATE INDEX IF NOT EXISTS idx_activities_user_timestamp ON activities(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activities_user_cursor ON activities(user_id, cursor);
`;

db.exec(migrationSql);

/**
 * Generate a cursor for pagination
 * @param {number} id - Activity ID
 * @param {string} timestamp - Activity timestamp
 * @returns {string} Base64 encoded cursor
 */
function generateCursor(id, timestamp) {
  const cursorData = { id, timestamp };
  return Buffer.from(JSON.stringify(cursorData)).toString('base64');
}

/**
 * Parse a cursor to extract pagination data
 * @param {string} cursor - Base64 encoded cursor
 * @returns {Object} Parsed cursor data with id and timestamp
 */
function parseCursor(cursor) {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch (error) {
    throw new Error('Invalid cursor format');
  }
}

/**
 * Create a new activity record
 * @param {Object} activityData - Activity data
 * @param {number} activityData.user_id - User ID
 * @param {string} activityData.event_type - Type of event
 * @param {string} [activityData.timestamp] - Event timestamp (defaults to current time)
 * @param {Object|string} [activityData.metadata] - Additional metadata
 * @returns {Promise<Object>} Created activity record
 */
function createActivity({ user_id, event_type, timestamp, metadata }) {
  const activityTimestamp = timestamp || new Date().toISOString();
  const metadataString = metadata ? (typeof metadata === 'string' ? metadata : JSON.stringify(metadata)) : null;
  
  const stmt = db.prepare(`
    INSERT INTO activities (user_id, event_type, timestamp, metadata, cursor)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  // Generate a temporary cursor - we'll update it with the actual ID after insertion
  const tempCursor = generateCursor(0, activityTimestamp);
  
  const result = stmt.run(user_id, event_type, activityTimestamp, metadataString, tempCursor);
  
  // Update the cursor with the actual ID
  const actualCursor = generateCursor(result.lastInsertRowid, activityTimestamp);
  db.prepare('UPDATE activities SET cursor = ? WHERE id = ?').run(actualCursor, result.lastInsertRowid);
  
  // Return the created activity
  const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(result.lastInsertRowid);
  
  // Parse metadata back to object if it's valid JSON
  if (activity.metadata) {
    try {
      activity.metadata = JSON.parse(activity.metadata);
    } catch (e) {
      // Keep as string if not valid JSON
    }
  }
  
  return Promise.resolve(activity);
}

/**
 * Get activity by ID
 * @param {number} id - Activity ID
 * @returns {Promise<Object|null>} Activity record or null if not found
 */
function getActivity(id) {
  const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(id);
  
  if (!activity) return Promise.resolve(null);
  
  // Parse metadata back to object if it's valid JSON
  if (activity.metadata) {
    try {
      activity.metadata = JSON.parse(activity.metadata);
    } catch (e) {
      // Keep as string if not valid JSON
    }
  }
  
  return Promise.resolve(activity);
}

/**
 * Get activities with cursor-based pagination
 * @param {Object} options - Query options
 * @param {number} [options.user_id] - Filter by user ID
 * @param {string} [options.event_type] - Filter by event type
 * @param {string} [options.cursor] - Cursor for pagination
 * @param {number} [options.limit=20] - Maximum number of records to return
 * @param {'asc'|'desc'} [options.order='desc'] - Sort order by timestamp
 * @returns {Promise<Object>} Object with activities array and pagination info
 */
function getActivities({ user_id, event_type, cursor, limit = 20, order = 'desc' } = {}) {
  let query = 'SELECT * FROM activities WHERE 1=1';
  const params = [];
  
  // Add filters
  if (user_id) {
    query += ' AND user_id = ?';
    params.push(user_id);
  }
  
  if (event_type) {
    query += ' AND event_type = ?';
    params.push(event_type);
  }
  
  // Add cursor-based pagination
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
  
  // Add ordering and limit
  query += ` ORDER BY timestamp ${order.toUpperCase()}, id ${order.toUpperCase()}`;
  query += ' LIMIT ?';
  params.push(limit + 1); // Get one extra to check if there are more results
  
  const stmt = db.prepare(query);
  const results = stmt.all(...params);
  
  // Check if there are more results
  const hasMore = results.length > limit;
  const activities = hasMore ? results.slice(0, limit) : results;
  
  // Parse metadata for all activities
  activities.forEach(activity => {
    if (activity.metadata) {
      try {
        activity.metadata = JSON.parse(activity.metadata);
      } catch (e) {
        // Keep as string if not valid JSON
      }
    }
  });
  
  // Generate next cursor if there are more results
  let nextCursor = null;
  if (hasMore && activities.length > 0) {
    const lastActivity = activities[activities.length - 1];
    nextCursor = generateCursor(lastActivity.id, lastActivity.timestamp);
  }
  
  return Promise.resolve({
    activities,
    pagination: {
      hasMore,
      nextCursor,
      limit,
      order
    }
  });
}

/**
 * Get activities for a specific user with cursor-based pagination
 * @param {number} userId - User ID
 * @param {Object} options - Query options
 * @param {string} [options.event_type] - Filter by event type
 * @param {string} [options.cursor] - Cursor for pagination
 * @param {number} [options.limit=20] - Maximum number of records to return
 * @param {'asc'|'desc'} [options.order='desc'] - Sort order by timestamp
 * @returns {Promise<Object>} Object with activities array and pagination info
 */
function getUserActivities(userId, options = {}) {
  return getActivities({ ...options, user_id: userId });
}

/**
 * Delete an activity
 * @param {number} id - Activity ID
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
function deleteActivity(id) {
  const stmt = db.prepare('DELETE FROM activities WHERE id = ?');
  const result = stmt.run(id);
  return Promise.resolve(result.changes > 0);
}

/**
 * Get activity count for a user
 * @param {number} userId - User ID
 * @param {string} [eventType] - Optional event type filter
 * @returns {Promise<number>} Count of activities
 */
function getActivityCount(userId, eventType) {
  let query = 'SELECT COUNT(*) as count FROM activities WHERE user_id = ?';
  const params = [userId];
  
  if (eventType) {
    query += ' AND event_type = ?';
    params.push(eventType);
  }
  
  const stmt = db.prepare(query);
  const result = stmt.get(...params);
  return Promise.resolve(result.count);
}

module.exports = {
  createActivity,
  getActivity,
  getActivities,
  getUserActivities,
  deleteActivity,
  getActivityCount,
  generateCursor,
  parseCursor
};