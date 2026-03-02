'use strict';
const Database = require('better-sqlite3');
const path = require('path');

/**
 * Migration: Create activity_events table with proper structure and indexes
 * @param {Database} db - SQLite database instance
 */
function up(db) {
  // Drop existing table if it exists (from the initial setup)
  db.exec('DROP TABLE IF EXISTS activity_events');
  
  // Create activity_events table with proper structure
  db.exec(`
    CREATE TABLE activity_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      metadata TEXT, -- JSON string for flexible data storage
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  
  // Create indexes for efficient querying
  db.exec('CREATE INDEX idx_activity_events_user_id ON activity_events(user_id)');
  db.exec('CREATE INDEX idx_activity_events_timestamp ON activity_events(timestamp)');
  db.exec('CREATE INDEX idx_activity_events_user_timestamp ON activity_events(user_id, timestamp)');
  db.exec('CREATE INDEX idx_activity_events_event_type ON activity_events(event_type)');
  
  // Create trigger to update updated_at timestamp
  db.exec(`
    CREATE TRIGGER update_activity_events_updated_at
    AFTER UPDATE ON activity_events
    FOR EACH ROW
    BEGIN
      UPDATE activity_events SET updated_at = datetime('now') WHERE id = NEW.id;
    END
  `);
}

/**
 * Rollback migration
 * @param {Database} db - SQLite database instance
 */
function down(db) {
  db.exec('DROP TRIGGER IF EXISTS update_activity_events_updated_at');
  db.exec('DROP INDEX IF EXISTS idx_activity_events_event_type');
  db.exec('DROP INDEX IF EXISTS idx_activity_events_user_timestamp');
  db.exec('DROP INDEX IF EXISTS idx_activity_events_timestamp');
  db.exec('DROP INDEX IF EXISTS idx_activity_events_user_id');
  db.exec('DROP TABLE IF EXISTS activity_events');
}

module.exports = { up, down };