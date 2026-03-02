'use strict';
const Database = require('better-sqlite3');
const path = require('path');

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

function getUser(id) {
  return Promise.resolve(db.prepare('SELECT * FROM users WHERE id = ?').get(id) || null);
}

function createUser({ name, email }) {
  const r = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)').run(name, email);
  return Promise.resolve(db.prepare('SELECT * FROM users WHERE id = ?').get(r.lastInsertRowid));
}

/**
 * Check if a user exists in the database
 * @param {string|number} id - The user ID to check
 * @returns {Promise<boolean>} - Promise that resolves to true if user exists, false otherwise
 * @throws {Error} - Throws error if database query fails
 */
function userExists(id) {
  try {
    // Use SELECT 1 for optimized existence check - doesn't fetch full user data
    const result = db.prepare('SELECT 1 FROM users WHERE id = ? LIMIT 1').get(id);
    return Promise.resolve(result !== undefined);
  } catch (error) {
    // Handle database errors appropriately
    return Promise.reject(new Error(`Database error checking user existence: ${error.message}`));
  }
}

module.exports = { getUser, createUser, userExists };