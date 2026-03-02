'use strict';
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../../demo.db'));

// Create activity_events table with proper schema and indexes
db.exec(`
  CREATE TABLE IF NOT EXISTS activity_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    event_type TEXT NOT NULL,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    metadata TEXT, -- JSON string for flexible metadata storage
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  
  -- Create indexes for efficient querying
  CREATE INDEX IF NOT EXISTS idx_activity_user_id ON activity_events(user_id);
  CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity_events(timestamp);
  CREATE INDEX IF NOT EXISTS idx_activity_user_timestamp ON activity_events(user_id, timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_activity_event_type ON activity_events(event_type);
`);

/**
 * Create a new activity event
 * @param {Object} activityData - The activity event data
 * @param {number} activityData.user_id - The user ID
 * @param {string} activityData.event_type - The type of event (e.g., 'login', 'logout', 'page_view')
 * @param {string} [activityData.timestamp] - Custom timestamp (ISO string), defaults to current time
 * @param {Object} [activityData.metadata] - Additional event metadata
 * @returns {Promise<Object>} The created activity event
 */
function createActivity({ user_id, event_type, timestamp, metadata }) {
  const stmt = db.prepare(`
    INSERT INTO activity_events (user_id, event_type, timestamp, metadata)
    VALUES (?, ?, COALESCE(?, datetime('now')), ?)
  `);
  
  const metadataJson = metadata ? JSON.stringify(metadata) : null;
  const result = stmt.run(user_id, event_type, timestamp, metadataJson);
  
  return Promise.resolve(getActivity(result.lastInsertRowid));
}

/**
 * Get a single activity event by ID
 * @param {number} id - The activity event ID
 * @returns {Promise<Object|null>} The activity event or null if not found
 */
function getActivity(id) {
  const stmt = db.prepare('SELECT * FROM activity_events WHERE id = ?');
  const activity = stmt.get(id);
  
  if (activity && activity.metadata) {
    try {
      activity.metadata = JSON.parse(activity.metadata);
    } catch (e) {
      // Keep as string if JSON parsing fails
    }
  }
  
  return Promise.resolve(activity || null);
}

/**
 * Get activity events for a user with pagination
 * @param {number} user_id - The user ID
 * @param {Object} [options] - Query options
 * @param {number} [options.limit=50] - Number of events to return
 * @param {number} [options.offset=0] - Number of events to skip
 * @param {string} [options.event_type] - Filter by event type
 * @param {string} [options.since] - Get events since this timestamp (ISO string)
 * @param {string} [options.until] - Get events until this timestamp (ISO string)
 * @returns {Promise<Object>} Object containing events array and pagination info
 */
function getUserActivities(user_id, options = {}) {
  const {
    limit = 50,
    offset = 0,
    event_type,
    since,
    until
  } = options;
  
  let whereClause = 'WHERE user_id = ?';
  let params = [user_id];
  
  if (event_type) {
    whereClause += ' AND event_type = ?';
    params.push(event_type);
  }
  
  if (since) {
    whereClause += ' AND timestamp >= ?';
    params.push(since);
  }
  
  if (until) {
    whereClause += ' AND timestamp <= ?';
    params.push(until);
  }
  
  // Get total count for pagination
  const countStmt = db.prepare(`
    SELECT COUNT(*) as total FROM activity_events ${whereClause}
  `);
  const { total } = countStmt.get(...params);
  
  // Get the actual events
  const eventsStmt = db.prepare(`
    SELECT * FROM activity_events 
    ${whereClause}
    ORDER BY timestamp DESC
    LIMIT ? OFFSET ?
  `);
  
  const events = eventsStmt.all(...params, limit, offset);
  
  // Parse metadata JSON for each event
  events.forEach(event => {
    if (event.metadata) {
      try {
        event.metadata = JSON.parse(event.metadata);
      } catch (e) {
        // Keep as string if JSON parsing fails
      }
    }
  });
  
  return Promise.resolve({
    events,
    pagination: {
      total,
      limit,
      offset,
      has_more: offset + limit < total
    }
  });
}

/**
 * Get all activity events with pagination (admin function)
 * @param {Object} [options] - Query options
 * @param {number} [options.limit=50] - Number of events to return
 * @param {number} [options.offset=0] - Number of events to skip
 * @param {string} [options.event_type] - Filter by event type
 * @param {number} [options.user_id] - Filter by user ID
 * @returns {Promise<Object>} Object containing events array and pagination info
 */
function getAllActivities(options = {}) {
  const {
    limit = 50,
    offset = 0,
    event_type,
    user_id
  } = options;
  
  let whereClause = '';
  let params = [];
  
  const conditions = [];
  
  if (user_id) {
    conditions.push('user_id = ?');
    params.push(user_id);
  }
  
  if (event_type) {
    conditions.push('event_type = ?');
    params.push(event_type);
  }
  
  if (conditions.length > 0) {
    whereClause = 'WHERE ' + conditions.join(' AND ');
  }
  
  // Get total count
  const countStmt = db.prepare(`
    SELECT COUNT(*) as total FROM activity_events ${whereClause}
  `);
  const { total } = countStmt.get(...params);
  
  // Get events
  const eventsStmt = db.prepare(`
    SELECT * FROM activity_events 
    ${whereClause}
    ORDER BY timestamp DESC
    LIMIT ? OFFSET ?
  `);
  
  const events = eventsStmt.all(...params, limit, offset);
  
  // Parse metadata JSON for each event
  events.forEach(event => {
    if (event.metadata) {
      try {
        event.metadata = JSON.parse(event.metadata);
      } catch (e) {
        // Keep as string if JSON parsing fails
      }
    }
  });
  
  return Promise.resolve({
    events,
    pagination: {
      total,
      limit,
      offset,
      has_more: offset + limit < total
    }
  });
}

/**
 * Delete activity events older than specified days
 * @param {number} days - Number of days to keep
 * @returns {Promise<number>} Number of deleted events
 */
function cleanupOldActivities(days = 90) {
  const stmt = db.prepare(`
    DELETE FROM activity_events 
    WHERE timestamp < datetime('now', '-' || ? || ' days')
  `);
  
  const result = stmt.run(days);
  return Promise.resolve(result.changes);
}

module.exports = {
  createActivity,
  getActivity,
  getUserActivities,
  getAllActivities,
  cleanupOldActivities
};