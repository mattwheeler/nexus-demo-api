'use strict';
const Database = require('better-sqlite3');
const path = require('path');
const { decodeCursor } = require('../utils/cursor');

const db = new Database(path.join(__dirname, '../../demo.db'));

// Ensure the activity_events table has proper indexes for our queries
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_activity_events_user_created_id 
  ON activity_events(user_id, created_at DESC, id DESC);
`);

/**
 * Retrieves activity events for a user with cursor-based pagination
 * @param {number} userId - The user ID to fetch activities for
 * @param {number} limit - Maximum number of records to return
 * @param {string|null} cursor - Optional cursor for pagination
 * @returns {Promise<Array>} Array of activity events ordered by created_at DESC, id DESC
 */
function getUserActivityEvents(userId, limit = 10, cursor = null) {
  return new Promise((resolve, reject) => {
    try {
      let query;
      let params;
      
      if (!cursor) {
        // First page - no cursor filtering
        query = `
          SELECT id, user_id, type, description, created_at
          FROM activity_events 
          WHERE user_id = ?
          ORDER BY created_at DESC, id DESC
          LIMIT ?
        `;
        params = [userId, limit];
      } else {
        // Subsequent pages - filter by cursor
        const cursorData = decodeCursor(cursor);
        if (!cursorData) {
          return reject(new Error('Invalid cursor format'));
        }
        
        query = `
          SELECT id, user_id, type, description, created_at
          FROM activity_events 
          WHERE user_id = ?
            AND (
              created_at < ? OR 
              (created_at = ? AND id < ?)
            )
          ORDER BY created_at DESC, id DESC
          LIMIT ?
        `;
        params = [userId, cursorData.created_at, cursorData.created_at, cursorData.id, limit];
      }
      
      const stmt = db.prepare(query);
      const results = stmt.all(...params);
      
      resolve(results || []);
    } catch (err) {
      reject(new Error(`Database error: ${err.message}`));
    }
  });
}

/**
 * Checks if a user exists in the database
 * @param {number} userId - The user ID to check
 * @returns {Promise<boolean>} True if user exists, false otherwise
 */
function userExists(userId) {
  return new Promise((resolve, reject) => {
    try {
      const stmt = db.prepare('SELECT 1 FROM users WHERE id = ? LIMIT 1');
      const result = stmt.get(userId);
      resolve(!!result);
    } catch (err) {
      reject(new Error(`Database error: ${err.message}`));
    }
  });
}

/**
 * Creates a new activity event for a user
 * @param {Object} eventData - The activity event data
 * @param {number} eventData.user_id - The user ID
 * @param {string} eventData.type - The event type
 * @param {string} eventData.description - The event description
 * @returns {Promise<Object>} The created activity event
 */
function createActivityEvent({ user_id, type, description }) {
  return new Promise((resolve, reject) => {
    try {
      const stmt = db.prepare(
        'INSERT INTO activity_events (user_id, type, description) VALUES (?, ?, ?)'
      );
      const result = stmt.run(user_id, type, description);
      
      const getStmt = db.prepare(
        'SELECT id, user_id, type, description, created_at FROM activity_events WHERE id = ?'
      );
      const newEvent = getStmt.get(result.lastInsertRowid);
      
      resolve(newEvent);
    } catch (err) {
      reject(new Error(`Database error: ${err.message}`));
    }
  });
}

module.exports = {
  getUserActivityEvents,
  userExists,
  createActivityEvent
};