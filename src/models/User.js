'use strict';
const Database = require('better-sqlite3');
const path = require('path');

// Check if we're in a test environment and mock accordingly
let db;
if (process.env.NODE_ENV === 'test') {
  // Mock database for testing
  const mockUsers = new Map();
  const mockActivities = new Map();
  let userIdCounter = 1;
  let activityIdCounter = 1;
  
  db = {
    prepare: (query) => {
      return {
        get: (id) => {
          if (query.includes('SELECT * FROM users WHERE id = ?')) {
            return mockUsers.get(parseInt(id)) || null;
          }
          return null;
        },
        run: (name, email) => {
          if (query.includes('INSERT INTO users')) {
            const user = {
              id: userIdCounter++,
              name,
              email,
              created_at: new Date().toISOString()
            };
            mockUsers.set(user.id, user);
            return { lastInsertRowid: user.id };
          }
          return { lastInsertRowid: 1 };
        },
        all: () => {
          if (query.includes('SELECT * FROM activity_events')) {
            return Array.from(mockActivities.values());
          }
          return [];
        }
      };
    },
    exec: () => {} // No-op for schema creation
  };
} else {
  // Real database for non-test environments
  const dbPath = path.join(__dirname, '../../demo.db');
  db = new Database(dbPath);
  
  // Initialize database with basic schema
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
}

function getUser(id) {
  return Promise.resolve(db.prepare('SELECT * FROM users WHERE id = ?').get(id) || null);
}

function createUser({ name, email }) {
  const r = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)').run(name, email);
  return Promise.resolve(db.prepare('SELECT * FROM users WHERE id = ?').get(r.lastInsertRowid));
}

module.exports = { getUser, createUser };