'use strict';
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../../demo.db'));

/**
 * Retrieves user activities with pagination support
 * @param {number} userId - The user ID to get activities for
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of activities to return
 * @param {number} options.offset - Number of activities to skip
 * @returns {Promise<Object>} Object containing activities array and total count
 */
async function getUserActivities(userId, options = {}) {
  const { limit = 10, offset = 0 } = options;
  
  try {
    // Get total count of activities for this user
    const countQuery = db.prepare('SELECT COUNT(*) as total FROM activity_events WHERE user_id = ?');
    const countResult = countQuery.get(userId);
    const total = countResult.total;
    
    // Get activities with pagination
    const activitiesQuery = db.prepare(`
      SELECT id, user_id, type, description, created_at, metadata
      FROM activity_events 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `);
    
    const activities = activitiesQuery.all(userId, limit, offset);
    
    return {
      activities,
      total
    };
    
  } catch (error) {
    console.error('Database error in getUserActivities:', error);
    throw new Error(`Failed to retrieve activities for user ${userId}`);
  }
}

/**
 * Creates a new activity event for a user
 * @param {number} userId - The user ID
 * @param {string} type - Activity type
 * @param {string} description - Activity description
 * @param {Object} metadata - Additional metadata (will be JSON stringified)
 * @returns {Promise<Object>} The created activity record
 */
async function createUserActivity(userId, type, description, metadata = null) {
  try {
    const metadataJson = metadata ? JSON.stringify(metadata) : null;
    
    const insertQuery = db.prepare(`
      INSERT INTO activity_events (user_id, type, description, metadata)
      VALUES (?, ?, ?, ?)
    `);
    
    const result = insertQuery.run(userId, type, description, metadataJson);
    
    // Return the created activity
    const selectQuery = db.prepare('SELECT * FROM activity_events WHERE id = ?');
    return selectQuery.get(result.lastInsertRowid);
    
  } catch (error) {
    console.error('Database error in createUserActivity:', error);
    throw new Error(`Failed to create activity for user ${userId}`);
  }
}

module.exports = {
  getUserActivities,
  createUserActivity
};