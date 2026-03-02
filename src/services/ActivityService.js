'use strict';
const Database = require('better-sqlite3');
const path = require('path');

// Use the same database instance
const db = new Database(path.join(__dirname, '../../demo.db'));

/**
 * Retrieve activity events for a user with cursor-based pagination
 * @param {number} userId - User ID
 * @param {Object} options - Query options
 * @param {number} [options.limit=20] - Maximum number of events to return
 * @param {string} [options.cursor] - Base64 encoded timestamp cursor for pagination
 * @param {string} [options.type] - Event type filter
 * @returns {Promise<Object>} Object containing events, hasNext, and nextCursor
 */
async function getActivityEvents(userId, options = {}) {
  const { limit = 20, cursor, type } = options;
  
  try {
    let query = `
      SELECT id, user_id, event_type, timestamp, metadata, created_at
      FROM activity_events 
      WHERE user_id = ?
    `;
    const params = [userId];
    
    // Add cursor condition for pagination
    if (cursor) {
      try {
        const decodedCursor = Buffer.from(cursor, 'base64').toString('utf-8');
        const cursorDate = new Date(decodedCursor);
        if (isNaN(cursorDate.getTime())) {
          throw new Error('Invalid cursor date');
        }
        query += ' AND timestamp < ?';
        params.push(decodedCursor);
      } catch (err) {
        throw new Error('Invalid cursor format');
      }
    }
    
    // Add event type filter
    if (type) {
      query += ' AND event_type = ?';
      params.push(type);
    }
    
    // Order by timestamp descending and apply limit + 1 for hasNext check
    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit + 1);
    
    const stmt = db.prepare(query);
    const rows = stmt.all(...params);
    
    // Check if there are more results
    const hasNext = rows.length > limit;
    const events = hasNext ? rows.slice(0, limit) : rows;
    
    // Generate next cursor if there are more results
    let nextCursor = null;
    if (hasNext && events.length > 0) {
      const lastEvent = events[events.length - 1];
      nextCursor = Buffer.from(lastEvent.timestamp).toString('base64');
    }
    
    // Transform events to match expected format
    const transformedEvents = events.map(event => ({
      id: event.id,
      userId: event.user_id,
      eventType: event.event_type,
      timestamp: event.timestamp,
      metadata: event.metadata ? JSON.parse(event.metadata) : null,
      createdAt: event.created_at
    }));
    
    return {
      events: transformedEvents,
      hasNext,
      nextCursor
    };
  } catch (error) {
    throw new Error(`Failed to retrieve activity events: ${error.message}`);
  }
}

/**
 * Create a new activity event for a user
 * @param {number} userId - User ID
 * @param {Object} eventData - Event data
 * @param {string} eventData.eventType - Type of the event
 * @param {string} [eventData.timestamp] - ISO timestamp (defaults to current time)
 * @param {Object} [eventData.metadata] - Additional event metadata
 * @returns {Promise<Object>} Created activity event
 */
async function createActivityEvent(userId, eventData) {
  const { eventType, timestamp = new Date().toISOString(), metadata } = eventData;
  
  try {
    const stmt = db.prepare(`
      INSERT INTO activity_events (user_id, event_type, timestamp, metadata)
      VALUES (?, ?, ?, ?)
    `);
    
    const metadataJson = metadata ? JSON.stringify(metadata) : null;
    const result = stmt.run(userId, eventType, timestamp, metadataJson);
    
    // Retrieve the created event
    const getStmt = db.prepare('SELECT * FROM activity_events WHERE id = ?');
    const createdEvent = getStmt.get(result.lastInsertRowid);
    
    return {
      id: createdEvent.id,
      userId: createdEvent.user_id,
      eventType: createdEvent.event_type,
      timestamp: createdEvent.timestamp,
      metadata: createdEvent.metadata ? JSON.parse(createdEvent.metadata) : null,
      createdAt: createdEvent.created_at
    };
  } catch (error) {
    throw new Error(`Failed to create activity event: ${error.message}`);
  }
}

module.exports = {
  getActivityEvents,
  createActivityEvent
};