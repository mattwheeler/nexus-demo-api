'use strict';
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

/**
 * Database migration utility
 */
class MigrationRunner {
  constructor(dbPath) {
    this.db = new Database(dbPath);
    this.migrationsPath = path.join(__dirname, '../migrations');
    this.init();
  }

  /**
   * Initialize migrations table
   */
  init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        executed_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  /**
   * Get list of executed migrations
   * @returns {string[]} Array of executed migration names
   */
  getExecutedMigrations() {
    return this.db.prepare('SELECT name FROM migrations ORDER BY id').all().map(row => row.name);
  }

  /**
   * Get list of available migration files
   * @returns {string[]} Array of migration file names
   */
  getAvailableMigrations() {
    if (!fs.existsSync(this.migrationsPath)) {
      return [];
    }
    
    return fs.readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.js'))
      .sort();
  }

  /**
   * Run pending migrations
   * @returns {Promise<string[]>} Array of executed migration names
   */
  async runMigrations() {
    const executed = this.getExecutedMigrations();
    const available = this.getAvailableMigrations();
    
    const pending = available.filter(migration => !executed.includes(migration));
    
    if (pending.length === 0) {
      console.log('No pending migrations');
      return [];
    }
    
    const executedMigrations = [];
    
    for (const migrationFile of pending) {
      try {
        console.log(`Running migration: ${migrationFile}`);
        
        const migrationPath = path.join(this.migrationsPath, migrationFile);
        const migration = require(migrationPath);
        
        // Begin transaction
        const transaction = this.db.transaction(() => {
          // Run the migration
          migration.up(this.db);
          
          // Record the migration as executed
          this.db.prepare('INSERT INTO migrations (name) VALUES (?)').run(migrationFile);
        });
        
        transaction();
        
        console.log(`Migration completed: ${migrationFile}`);
        executedMigrations.push(migrationFile);
      } catch (error) {
        console.error(`Migration failed: ${migrationFile}`, error);
        throw error;
      }
    }
    
    return executedMigrations;
  }

  /**
   * Rollback last migration
   * @returns {Promise<string|null>} Name of rolled back migration or null
   */
  async rollbackMigration() {
    const executed = this.db.prepare('SELECT name FROM migrations ORDER BY id DESC LIMIT 1').get();
    
    if (!executed) {
      console.log('No migrations to rollback');
      return null;
    }
    
    try {
      console.log(`Rolling back migration: ${executed.name}`);
      
      const migrationPath = path.join(this.migrationsPath, executed.name);
      const migration = require(migrationPath);
      
      // Begin transaction
      const transaction = this.db.transaction(() => {
        // Run the rollback
        if (migration.down) {
          migration.down(this.db);
        }
        
        // Remove the migration record
        this.db.prepare('DELETE FROM migrations WHERE name = ?').run(executed.name);
      });
      
      transaction();
      
      console.log(`Migration rolled back: ${executed.name}`);
      return executed.name;
    } catch (error) {
      console.error(`Rollback failed: ${executed.name}`, error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  close() {
    this.db.close();
  }
}

module.exports = { MigrationRunner };