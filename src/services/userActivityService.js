'use strict';
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../../demo.db'));

// Ensure user_activities table exists
db.exec(`
  CREATE TABLE IF NOT EXISTS user_activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    type TEXT NOT NULL,
    metadata TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

/**
 * Retrieves user activities from the database with pagination support
 * 
 * @param {number} userId - The ID of the user to fetch activities for
 * @param {number} limit - Maximum number of activities to return (1-50)
 * @param {number} offset - Number of activities to skip for pagination
 * @returns {Promise<Array>} Promise that resolves to array of user activity records
 * @throws {Error} Database connection or query errors
 */
async function getUserActivities(userId, limit = 10, offset = 0) {
  try {
    // Prepare the SQL query with parameterized values to prevent SQL injection
    const query = `
      SELECT id, user_id, type, metadata, created_at
      FROM user_activities
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    // Execute the query with bound parameters
    const stmt = db.prepare(query);
    const activities = stmt.all(userId, limit, offset);
    
    return activities;
  } catch (error) {
    // Log the error for debugging purposes
    console.error('Database error in getUserActivities:', error);
    
    // Throw a more user-friendly error
    const dbError = new Error('Failed to retrieve user activities from database');
    dbError.status = 500;
    dbError.originalError = error;
    throw dbError;
  }
}

/**
 * Gets the total count of activities for a user (useful for pagination metadata)
 * 
 * @param {number} userId - The ID of the user to count activities for
 * @returns {Promise<number>} Promise that resolves to the total count of activities
 * @throws {Error} Database connection or query errors
 */
async function getUserActivitiesCount(userId) {
  try {
    const query = `
      SELECT COUNT(*) as total
      FROM user_activities
      WHERE user_id = ?
    `;
    
    const stmt = db.prepare(query);
    const result = stmt.get(userId);
    
    return result.total;
  } catch (error) {
    console.error('Database error in getUserActivitiesCount:', error);
    
    const dbError = new Error('Failed to count user activities in database');
    dbError.status = 500;
    dbError.originalError = error;
    throw dbError;
  }
}

module.exports = {
  getUserActivities,
  getUserActivitiesCount
};