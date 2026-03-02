'use strict';
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../../demo.db'));

/**
 * Retrieves paginated activity events for a user
 * @param {number} userId - User ID
 * @param {Object} options - Pagination options
 * @param {number} options.limit - Number of activities to return
 * @param {number} options.offset - Number of activities to skip
 * @returns {Promise<Object>} Object containing activities array and total count
 */
async function getUserActivities(userId, options = {}) {
  const { limit = 10, offset = 0 } = options;
  
  try {
    // Get total count
    const countQuery = db.prepare('SELECT COUNT(*) as total FROM activity_events WHERE user_id = ?');
    const countResult = countQuery.get(userId);
    const total = countResult.total;
    
    // Get paginated activities
    const activitiesQuery = db.prepare(`
      SELECT id, type, description, created_at
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
    const dbError = new Error('Failed to retrieve user activities');
    dbError.type = 'DATABASE_ERROR';
    dbError.statusCode = 500;
    throw dbError;
  }
}

module.exports = { getUserActivities };