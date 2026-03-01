'use strict';
const Database = require('better-sqlite3');
const path = require('path');
const { z } = require('zod');

const db = new Database(path.join(__dirname, '../../demo.db'));

// Activity schema validation
const ActivitySchema = z.object({
  user_id: z.number().positive(),
  type: z.string().min(1),
  description: z.string().optional()
});

/**
 * Get activities for a user with cursor-based pagination
 * @param {number} userId - User ID
 * @param {Object} options - Pagination options
 * @param {string} options.cursor - Cursor token for pagination
 * @param {number} options.limit - Number of results to return (default: 10)
 * @returns {Promise<Object[]>} Array of activity events
 */
function getActivitiesForUser(userId, { cursor, limit = 10 } = {}) {
  let query = `
    SELECT id, user_id, type, description, created_at
    FROM activity_events
    WHERE user_id = ?
  `;
  const params = [userId];

  // Add cursor condition if provided
  if (cursor) {
    const cursorTimestamp = parseCursor(cursor);
    if (cursorTimestamp) {
      query += ' AND created_at < ?';
      params.push(cursorTimestamp);
    }
  }

  query += ' ORDER BY created_at DESC, id DESC LIMIT ?';
  params.push(limit);

  return Promise.resolve(
    db.prepare(query).all(...params)
  );
}

/**
 * Create a new activity event
 * @param {Object} activity - Activity data
 * @param {number} activity.user_id - User ID
 * @param {string} activity.type - Activity type
 * @param {string} [activity.description] - Activity description
 * @returns {Promise<Object>} Created activity event
 */
function createActivity(activity) {
  const validatedActivity = ActivitySchema.parse(activity);
  
  const stmt = db.prepare(`
    INSERT INTO activity_events (user_id, type, description)
    VALUES (?, ?, ?)
  `);
  
  const result = stmt.run(
    validatedActivity.user_id,
    validatedActivity.type,
    validatedActivity.description || null
  );
  
  return Promise.resolve(
    db.prepare('SELECT * FROM activity_events WHERE id = ?').get(result.lastInsertRowid)
  );
}

/**
 * Generate cursor token from timestamp
 * @param {string} timestamp - ISO timestamp
 * @returns {string} Base64 encoded cursor token
 */
function generateCursor(timestamp) {
  return Buffer.from(timestamp).toString('base64');
}

/**
 * Parse cursor token to extract timestamp
 * @param {string} cursor - Base64 encoded cursor token
 * @returns {string|null} Decoded timestamp or null if invalid
 */
function parseCursor(cursor) {
  try {
    return Buffer.from(cursor, 'base64').toString('utf8');
  } catch (error) {
    return null;
  }
}

module.exports = {
  getActivitiesForUser,
  createActivity,
  generateCursor,
  parseCursor,
  ActivitySchema
};