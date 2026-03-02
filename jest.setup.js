'use strict';
const Database = require('better-sqlite3');
const path = require('path');

// Setup test database before each test
beforeEach(() => {
  const db = new Database(path.join(__dirname, 'demo.db'));
  
  // Clear existing data
  try {
    db.exec('DELETE FROM activity_events');
    db.exec('DELETE FROM users');
  } catch (err) {
    // Tables might not exist yet, ignore
  }
  
  // Ensure tables exist with proper structure
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    
    CREATE TABLE IF NOT EXISTS activity_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  
  // Create indexes if they don't exist
  try {
    db.exec('CREATE INDEX IF NOT EXISTS idx_activity_events_user_id ON activity_events(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_activity_events_timestamp ON activity_events(timestamp DESC)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_activity_events_user_timestamp ON activity_events(user_id, timestamp DESC)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_activity_events_event_type ON activity_events(event_type)');
  } catch (err) {
    // Indexes might already exist, ignore errors
  }
  
  db.close();
});