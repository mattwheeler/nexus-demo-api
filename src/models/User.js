'use strict';
const Database = require('better-sqlite3');
const path = require('path');
const { MigrationRunner } = require('../db/migrate');

const dbPath = path.join(__dirname, '../../demo.db');
const db = new Database(dbPath);

// Initialize database with basic schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// Run migrations on startup
(async () => {
  const migrationRunner = new MigrationRunner(dbPath);
  try {
    await migrationRunner.runMigrations();
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    migrationRunner.close();
  }
})();

/**
 * Get a user by ID
 * @param {number} id - User ID
 * @returns {Promise<Object|null>} User object or null if not found
 */
function getUser(id) {
  return Promise.resolve(db.prepare('SELECT * FROM users WHERE id = ?').get(id) || null);
}

/**
 * Create a new user
 * @param {Object} userData - User data
 * @param {string} userData.name - User name
 * @param {string} userData.email - User email
 * @returns {Promise<Object>} Created user object
 */
function createUser({ name, email }) {
  const r = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)').run(name, email);
  return Promise.resolve(db.prepare('SELECT * FROM users WHERE id = ?').get(r.lastInsertRowid));
}

module.exports = { getUser, createUser };