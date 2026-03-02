'use strict';
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../../demo.db'));

// Create users table - activity_events table is now handled by Activity model
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

/**
 * Get user by ID
 * @param {number} id - The user ID
 * @returns {Promise<Object|null>} The user or null if not found
 */
function getUser(id) {
  return Promise.resolve(db.prepare('SELECT * FROM users WHERE id = ?').get(id) || null);
}

/**
 * Create a new user
 * @param {Object} userData - The user data
 * @param {string} userData.name - The user's name
 * @param {string} userData.email - The user's email
 * @returns {Promise<Object>} The created user
 */
function createUser({ name, email }) {
  const r = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)').run(name, email);
  return Promise.resolve(db.prepare('SELECT * FROM users WHERE id = ?').get(r.lastInsertRowid));
}

module.exports = { getUser, createUser };