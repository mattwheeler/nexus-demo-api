'use strict';
const { getUserActivities } = require('../models/Activity');
const { getUser } = require('../models/User');

/**
 * Encodes cursor data into a base64 string
 * @param {Object} cursorData - The cursor data to encode
 * @param {string} cursorData.timestamp - The timestamp for pagination
 * @param {number} cursorData.id - The ID for tie-breaking
 * @returns {string} Base64 encoded cursor
 */
function encodeCursor(cursorData) {
  const cursorString = JSON.stringify(cursorData);
  return Buffer.from(cursorString, 'utf8').toString('base64');
}

/**
 * Decodes a cursor from base64 string
 * @param {string} cursor - The base64 encoded cursor
 * @returns {Object} Decoded cursor data
 * @throws {Error} If cursor is invalid
 */
function decodeCursor(cursor) {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf8');
    
    // Try to parse as JSON first (for complex cursors)
    try {
      const cursorData = JSON.parse(decoded);
      if (!cursorData.timestamp && !cursorData.id) {
        throw new Error('Invalid cursor structure');
      }
      return cursorData;
    } catch (jsonError) {
      // If not JSON, treat as direct timestamp
      const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
      if (!timestampRegex.test(decoded)) {
        throw new Error('Invalid cursor format');
      }
      return { timestamp: decoded };
    }
  } catch (error) {
    // If base64 decoding fails, try as direct timestamp
    const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    if (timestampRegex.test(cursor)) {
      return { timestamp: cursor };
    }
    throw new Error('Invalid cursor format');
  }
}

/**
 * Fetches user activity events with cursor-based pagination
 * @param {number} userId - The user ID to fetch activities for
 * @param {Object} [options] - Query options
 * @param {string} [options.cursor] - Cursor for pagination continuation
 * @param {number} [options.limit=10] - Number of items to return (default 10)
 * @param {string} [options.event_type] - Filter by event type
 * @param {string} [options.since] - Get events since this timestamp
 * @param {string} [options.until] - Get events until this timestamp
 * @returns {Promise<Object>} Object containing events, pagination info, and next cursor
 */
async function getUserActivitiesPaginated(userId, options = {}) {
  const {
    cursor,
    limit = 10,
    event_type,
    since,
    until
  } = options;
  
  // Verify user exists
  const user = await getUser(userId);
  if (!user) {
    throw new Error('User not found');
  }
  
  let queryOptions = {
    limit: limit + 1, // Fetch one extra to check if there's more data
    offset: 0,
    event_type,
    since,
    until
  };
  
  // Handle cursor-based pagination
  if (cursor) {
    try {
      const decodedCursor = decodeCursor(cursor);
      
      // Use cursor timestamp as 'until' parameter to get events before this point
      if (decodedCursor.timestamp) {
        queryOptions.until = until ? (until < decodedCursor.timestamp ? until : decodedCursor.timestamp) : decodedCursor.timestamp;
      }
      
      // If cursor has ID, we need to implement more sophisticated filtering
      // For now, we'll use timestamp-based pagination which is simpler
    } catch (error) {
      throw new Error('Invalid cursor provided');
    }
  }
  
  // Fetch activities using the existing model method
  const result = await getUserActivities(userId, queryOptions);
  
  // Extract the events and check if there's more data
  const events = result.events;
  const hasMore = events.length > limit;
  
  // Remove the extra event if we fetched one more than requested
  if (hasMore) {
    events.pop();
  }
  
  // Generate next cursor if there's more data
  let nextCursor = null;
  if (hasMore && events.length > 0) {
    const lastEvent = events[events.length - 1];
    nextCursor = encodeCursor({
      timestamp: lastEvent.timestamp,
      id: lastEvent.id
    });
  }
  
  return {
    events,
    pagination: {
      limit,
      has_more: hasMore,
      next_cursor: nextCursor
    }
  };
}

/**
 * Fetches user activity events with enhanced cursor-based pagination
 * This version implements proper cursor-based pagination by modifying the SQL query
 * to handle both timestamp and ID for proper ordering and tie-breaking
 * @param {number} userId - The user ID to fetch activities for
 * @param {Object} [options] - Query options
 * @param {string} [options.cursor] - Cursor for pagination continuation
 * @param {number} [options.limit=10] - Number of items to return (default 10)
 * @param {string} [options.event_type] - Filter by event type
 * @param {string} [options.since] - Get events since this timestamp
 * @param {string} [options.until] - Get events until this timestamp
 * @returns {Promise<Object>} Object containing events, pagination info, and next cursor
 */
async function getUserActivitiesWithCursor(userId, options = {}) {
  const Database = require('better-sqlite3');
  const path = require('path');
  const db = new Database(path.join(__dirname, '../../demo.db'));
  
  const {
    cursor,
    limit = 10,
    event_type,
    since,
    until
  } = options;
  
  // Verify user exists
  const user = await getUser(userId);
  if (!user) {
    throw new Error('User not found');
  }
  
  let whereClause = 'WHERE user_id = ?';
  let params = [userId];
  
  // Handle cursor for pagination
  let cursorTimestamp = null;
  let cursorId = null;
  if (cursor) {
    try {
      const decodedCursor = decodeCursor(cursor);
      cursorTimestamp = decodedCursor.timestamp;
      cursorId = decodedCursor.id;
      
      // Add cursor conditions for proper pagination
      if (cursorTimestamp && cursorId) {
        whereClause += ' AND (timestamp < ? OR (timestamp = ? AND id < ?))';
        params.push(cursorTimestamp, cursorTimestamp, cursorId);
      } else if (cursorTimestamp) {
        whereClause += ' AND timestamp < ?';
        params.push(cursorTimestamp);
      }
    } catch (error) {
      throw new Error('Invalid cursor provided');
    }
  }
  
  // Add other filters
  if (event_type) {
    whereClause += ' AND event_type = ?';
    params.push(event_type);
  }
  
  if (since) {
    whereClause += ' AND timestamp >= ?';
    params.push(since);
  }
  
  if (until && !cursorTimestamp) {
    whereClause += ' AND timestamp <= ?';
    params.push(until);
  } else if (until && cursorTimestamp) {
    // Use the more restrictive of until and cursor timestamp
    const restrictiveUntil = until < cursorTimestamp ? until : cursorTimestamp;
    whereClause = whereClause.replace('timestamp < ?', 'timestamp <= ?');
    params[params.length - (cursorId ? 3 : 1)] = restrictiveUntil;
  }
  
  // Fetch one extra record to check if there's more data
  const eventsStmt = db.prepare(`
    SELECT * FROM activity_events 
    ${whereClause}
    ORDER BY timestamp DESC, id DESC
    LIMIT ?
  `);
  
  const events = eventsStmt.all(...params, limit + 1);
  
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
  
  // Check if there's more data
  const hasMore = events.length > limit;
  
  // Remove the extra event if we fetched one more than requested
  if (hasMore) {
    events.pop();
  }
  
  // Generate next cursor if there's more data
  let nextCursor = null;
  if (hasMore && events.length > 0) {
    const lastEvent = events[events.length - 1];
    nextCursor = encodeCursor({
      timestamp: lastEvent.timestamp,
      id: lastEvent.id
    });
  }
  
  return {
    events,
    pagination: {
      limit,
      has_more: hasMore,
      next_cursor: nextCursor
    }
  };
}

/**
 * Main service function that provides cursor-based pagination for user activities
 * This is the primary function that should be used by controllers
 * @param {number} userId - The user ID to fetch activities for
 * @param {Object} [options] - Query options
 * @param {string} [options.cursor] - Cursor for pagination continuation
 * @param {number} [options.limit=10] - Number of items to return (default 10)
 * @param {string} [options.event_type] - Filter by event type
 * @param {string} [options.since] - Get events since this timestamp
 * @param {string} [options.until] - Get events until this timestamp
 * @returns {Promise<Object>} Object containing events, pagination info, and next cursor
 */
async function getActivityFeed(userId, options = {}) {
  try {
    // Use the enhanced cursor-based pagination method
    return await getUserActivitiesWithCursor(userId, options);
  } catch (error) {
    // Handle specific error cases
    if (error.message === 'User not found') {
      throw error; // Re-throw as-is
    }
    if (error.message === 'Invalid cursor provided') {
      throw error; // Re-throw as-is
    }
    
    // For any other errors, wrap in a generic service error
    throw new Error(`Failed to fetch activity feed: ${error.message}`);
  }
}

module.exports = {
  getActivityFeed,
  getUserActivitiesPaginated,
  getUserActivitiesWithCursor,
  encodeCursor,
  decodeCursor
};