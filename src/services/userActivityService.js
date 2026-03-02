'use strict';
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../../demo.db'));

/**
 * Retrieves user activities from the database with pagination
 * @param {number} userId - The user ID to get activities for
 * @param {Object} options - Query options
 * @param {number} options.limit - Number of activities to return (1-50)
 * @param {number} options.offset - Number of activities to skip
 * @returns {Promise<Object>} Object containing activities array and total count
 */
async function getUserActivities(userId, options = {}) {
  const { limit = 10, offset = 0 } = options;
  
  try {
    // Get total count of activities for this user
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM activity_events WHERE user_id = ?');
    const countResult = countStmt.get(userId);
    const total = countResult ? countResult.count : 0;
    
    // Get activities with pagination
    const activitiesStmt = db.prepare(`
      SELECT id, user_id, type, description, metadata, created_at 
      FROM activity_events 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `);
    
    const activities = activitiesStmt.all(userId, limit, offset);
    
    return {
      activities,
      total
    };
  } catch (error) {
    throw new Error(`Failed to retrieve user activities: ${error.message}`);
  }
}

module.exports = { getUserActivities };