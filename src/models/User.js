'use strict';
const Database = require('better-sqlite3');
const path = require('path');
const { withDatabaseErrorHandling } = require('../utils/errorHelpers');

const db = new Database(path.join(__dirname, '../../demo.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS activity_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    type TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

/**
 * Get user by ID with database error handling
 * @param {string|number} id - User ID
 * @returns {Promise<Object|null>} User object or null if not found
 */
function getUser(id) {
  return withDatabaseErrorHandling(() => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    return Promise.resolve(user || null);
  });
}

/**
 * Create a new user with database error handling
 * @param {Object} userData - User data
 * @param {string} userData.name - User name
 * @param {string} userData.email - User email
 * @returns {Promise<Object>} Created user object
 */
function createUser({ name, email }) {
  return withDatabaseErrorHandling(() => {
    const result = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)').run(name, email);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    return Promise.resolve(user);
  });
}

/**
 * Get user activities with pagination support
 * @param {string|number} userId - User ID
 * @param {Object} options - Pagination options
 * @param {number} options.limit - Maximum number of results
 * @param {string} options.cursor - Pagination cursor
 * @param {number} options.offset - Results offset
 * @returns {Promise<Object>} Activities with pagination info
 */
function getUserActivities(userId, { limit = 10, cursor, offset = 0 } = {}) {
  return withDatabaseErrorHandling(() => {
    let query = 'SELECT * FROM activity_events WHERE user_id = ?';
    let params = [userId];
    
    // Handle cursor-based pagination
    if (cursor) {
      try {
        const decoded = Buffer.from(cursor, 'base64').toString('utf8');
        const cursorData = JSON.parse(decoded);
        query += ' AND (created_at < ? OR (created_at = ? AND id < ?))';
        params.push(cursorData.created_at, cursorData.created_at, cursorData.id);
      } catch (error) {
        // Invalid cursor will be handled by validation layer
      }
    }
    
    query += ' ORDER BY created_at DESC, id DESC';
    
    // Handle offset-based pagination
    if (offset > 0) {
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);
    } else {
      query += ' LIMIT ?';
      params.push(limit);
    }
    
    const activities = db.prepare(query).all(...params);
    
    // Generate next cursor if we have more results
    let nextCursor = null;
    if (activities.length === limit) {
      const lastActivity = activities[activities.length - 1];
      const cursorData = {
        id: lastActivity.id,
        created_at: lastActivity.created_at
      };
      nextCursor = Buffer.from(JSON.stringify(cursorData)).toString('base64');
    }
    
    return Promise.resolve({
      data: activities,
      pagination: {
        limit,
        offset,
        hasMore: activities.length === limit,
        nextCursor
      }
    });
  });
}

module.exports = { 
  getUser, 
  createUser, 
  getUserActivities 
};