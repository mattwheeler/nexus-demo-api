'use strict';
const Database = require('better-sqlite3');
const path = require('path');
const { z } = require('zod');

const db = new Database(path.join(__dirname, '../../demo.db'));

// Validation schemas
const ActivityEventSchema = z.object({
  userId: z.number().int().positive('User ID must be a positive integer'),
  eventType: z.string().min(1, 'Event type is required').max(100, 'Event type too long'),
  timestamp: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional()
});

const UpdateActivityEventSchema = z.object({
  eventType: z.string().min(1).max(100).optional(),
  metadata: z.record(z.any()).optional()
});

/**
 * Create a new activity event
 * @param {Object} eventData - The activity event data
 * @param {number} eventData.userId - ID of the user associated with the event
 * @param {string} eventData.eventType - Type of the activity event
 * @param {string} [eventData.timestamp] - ISO timestamp of the event
 * @param {Object} [eventData.metadata] - Additional event metadata
 * @returns {Promise<Object>} The created activity event
 * @throws {Error} If validation fails or database operation fails
 */
function createActivityEvent(eventData) {
  return new Promise((resolve, reject) => {
    try {
      // Validate input data
      const validatedData = ActivityEventSchema.parse(eventData);
      
      // Prepare metadata as JSON string if provided
      const metadataJson = validatedData.metadata ? JSON.stringify(validatedData.metadata) : null;
      
      // Prepare SQL statement
      const stmt = validatedData.timestamp 
        ? db.prepare('INSERT INTO activity_events (user_id, event_type, timestamp, metadata) VALUES (?, ?, ?, ?)')
        : db.prepare('INSERT INTO activity_events (user_id, event_type, metadata) VALUES (?, ?, ?)');
      
      // Execute insert
      const result = validatedData.timestamp
        ? stmt.run(validatedData.userId, validatedData.eventType, validatedData.timestamp, metadataJson)
        : stmt.run(validatedData.userId, validatedData.eventType, metadataJson);
      
      // Fetch and return the created event
      const createdEvent = getActivityEvent(result.lastInsertRowid);
      resolve(createdEvent);
    } catch (error) {
      if (error.name === 'ZodError') {
        const validationError = new Error('Validation failed');
        validationError.details = error.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message
        }));
        validationError.status = 400;
        reject(validationError);
      } else {
        reject(error);
      }
    }
  });
}

/**
 * Get an activity event by ID
 * @param {number} id - The activity event ID
 * @returns {Object|null} The activity event or null if not found
 */
function getActivityEvent(id) {
  const event = db.prepare('SELECT * FROM activity_events WHERE id = ?').get(id);
  if (!event) return null;
  
  return formatActivityEvent(event);
}

/**
 * Get activity events for a specific user
 * @param {number} userId - The user ID
 * @param {Object} options - Query options
 * @param {number} [options.limit=20] - Maximum number of events to return
 * @param {string} [options.cursor] - Cursor for pagination (timestamp)
 * @param {string} [options.eventType] - Filter by event type
 * @returns {Promise<Object>} Object containing events and pagination info
 */
function getActivityEventsByUser(userId, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const { limit = 20, cursor, eventType } = options;
      
      let query = 'SELECT * FROM activity_events WHERE user_id = ?';
      const params = [userId];
      
      // Add event type filter if provided
      if (eventType) {
        query += ' AND event_type = ?';
        params.push(eventType);
      }
      
      // Add cursor-based pagination
      if (cursor) {
        query += ' AND timestamp < ?';
        params.push(cursor);
      }
      
      // Order by timestamp descending and limit
      query += ' ORDER BY timestamp DESC, id DESC LIMIT ?';
      params.push(limit + 1); // Fetch one extra to check if there are more
      
      const events = db.prepare(query).all(...params);
      
      // Check if there are more events
      const hasMore = events.length > limit;
      if (hasMore) {
        events.pop(); // Remove the extra event
      }
      
      // Format events and determine next cursor
      const formattedEvents = events.map(formatActivityEvent);
      const nextCursor = formattedEvents.length > 0 
        ? formattedEvents[formattedEvents.length - 1].timestamp 
        : null;
      
      resolve({
        events: formattedEvents,
        hasMore,
        nextCursor: hasMore ? nextCursor : null
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Update an activity event
 * @param {number} id - The activity event ID
 * @param {Object} updateData - Data to update
 * @param {string} [updateData.eventType] - New event type
 * @param {Object} [updateData.metadata] - New metadata
 * @returns {Promise<Object|null>} The updated activity event or null if not found
 */
function updateActivityEvent(id, updateData) {
  return new Promise((resolve, reject) => {
    try {
      // Validate input data
      const validatedData = UpdateActivityEventSchema.parse(updateData);
      
      if (Object.keys(validatedData).length === 0) {
        return resolve(getActivityEvent(id));
      }
      
      const updates = [];
      const params = [];
      
      if (validatedData.eventType) {
        updates.push('event_type = ?');
        params.push(validatedData.eventType);
      }
      
      if (validatedData.metadata !== undefined) {
        updates.push('metadata = ?');
        params.push(validatedData.metadata ? JSON.stringify(validatedData.metadata) : null);
      }
      
      if (updates.length === 0) {
        return resolve(getActivityEvent(id));
      }
      
      params.push(id);
      const query = `UPDATE activity_events SET ${updates.join(', ')} WHERE id = ?`;
      
      const result = db.prepare(query).run(...params);
      
      if (result.changes === 0) {
        return resolve(null);
      }
      
      resolve(getActivityEvent(id));
    } catch (error) {
      if (error.name === 'ZodError') {
        const validationError = new Error('Validation failed');
        validationError.details = error.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message
        }));
        validationError.status = 400;
        reject(validationError);
      } else {
        reject(error);
      }
    }
  });
}

/**
 * Delete an activity event
 * @param {number} id - The activity event ID
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
function deleteActivityEvent(id) {
  return new Promise((resolve) => {
    const result = db.prepare('DELETE FROM activity_events WHERE id = ?').run(id);
    resolve(result.changes > 0);
  });
}

/**
 * Format activity event from database row
 * @param {Object} row - Database row
 * @returns {Object} Formatted activity event
 */
function formatActivityEvent(row) {
  return {
    id: row.id,
    userId: row.user_id,
    eventType: row.event_type,
    timestamp: row.timestamp,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Get activity event statistics for a user
 * @param {number} userId - The user ID
 * @param {Object} options - Options
 * @param {string} [options.startDate] - Start date for statistics (ISO string)
 * @param {string} [options.endDate] - End date for statistics (ISO string)
 * @returns {Promise<Object>} Statistics object
 */
function getActivityEventStats(userId, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const { startDate, endDate } = options;
      
      let query = `
        SELECT 
          COUNT(*) as totalEvents,
          event_type,
          COUNT(*) as count
        FROM activity_events 
        WHERE user_id = ?
      `;
      const params = [userId];
      
      if (startDate) {
        query += ' AND timestamp >= ?';
        params.push(startDate);
      }
      
      if (endDate) {
        query += ' AND timestamp <= ?';
        params.push(endDate);
      }
      
      query += ' GROUP BY event_type ORDER BY count DESC';
      
      const eventTypeStats = db.prepare(query).all(...params);
      
      // Get total count
      let totalQuery = 'SELECT COUNT(*) as total FROM activity_events WHERE user_id = ?';
      const totalParams = [userId];
      
      if (startDate) {
        totalQuery += ' AND timestamp >= ?';
        totalParams.push(startDate);
      }
      
      if (endDate) {
        totalQuery += ' AND timestamp <= ?';
        totalParams.push(endDate);
      }
      
      const totalResult = db.prepare(totalQuery).get(...totalParams);
      
      resolve({
        totalEvents: totalResult.total,
        eventTypes: eventTypeStats.map(stat => ({
          eventType: stat.event_type,
          count: stat.count
        }))
      });
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  createActivityEvent,
  getActivityEvent,
  getActivityEventsByUser,
  updateActivityEvent,
  deleteActivityEvent,
  getActivityEventStats,
  ActivityEventSchema,
  UpdateActivityEventSchema
};