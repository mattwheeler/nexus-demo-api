'use strict';
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../../demo.db'));

/**
 * Retrieves activity events for a specific user with pagination support
 * @param {number} userId - The user ID to fetch activities for
 * @param {Object} options - Query options
 * @param {string} [options.cursor] - Pagination cursor (ISO date string)
 * @param {number} [options.limit=10] - Maximum number of results to return
 * @returns {Promise<Array>} Array of activity events
 */
async function getActivityByUserId(userId, options = {}) {
  const { cursor, limit = 10 } = options;
  
  let query = `
    SELECT id, user_id, type, description, created_at 
    FROM activity_events 
    WHERE user_id = ?
  `;
  
  const params = [userId];
  
  // Add cursor-based pagination
  if (cursor) {
    query += ' AND created_at < ?';
    params.push(cursor);
  }
  
  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);
  
  const stmt = db.prepare(query);
  const activities = stmt.all(...params);
  
  return Promise.resolve(activities.map(activity => ({
    ...activity,
    user_id: parseInt(activity.user_id, 10)
  })));
}

module.exports = {
  getActivityByUserId
};