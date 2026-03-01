'use strict';
const path = require('path');

let db;

// Initialize database only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  const Database = require('better-sqlite3');
  db = new Database(path.join(__dirname, '../../demo.db'));
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
} else {
  // Mock database for tests
  const mockUsers = new Map();
  let mockIdCounter = 1;
  
  db = {
    prepare: (query) => ({
      get: (id) => {
        if (query.includes('SELECT * FROM users WHERE id')) {
          return mockUsers.get(parseInt(id)) || null;
        }
        return null;
      },
      run: (name, email) => {
        if (query.includes('INSERT INTO users')) {
          const id = mockIdCounter++;
          const user = {
            id,
            name,
            email,
            created_at: new Date().toISOString()
          };
          mockUsers.set(id, user);
          return { lastInsertRowid: id };
        }
        return { lastInsertRowid: null };
      }
    })
  };
}

function getUser(id) {
  return Promise.resolve(db.prepare('SELECT * FROM users WHERE id = ?').get(id) || null);
}

function createUser({ name, email }) {
  const r = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)').run(name, email);
  return Promise.resolve(db.prepare('SELECT * FROM users WHERE id = ?').get(r.lastInsertRowid));
}

module.exports = { getUser, createUser };