'use strict';
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../../demo.db'));

/**
 * Get user activities with pagination support
 * @param {number} userId - User ID to fetch activities for
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of results to return
 * @param {string} [options.cursor] - Cursor for pagination (activity ID)
 * @param {string} [options.type] - Filter by activity type
 * @returns {Promise<Object>} Activities with pagination metadata
 */
async function getUserActivities(userId, options = {}) {
  const { limit = 10, cursor, type } = options;
  
  let query = `
    SELECT id, user_id, type, description, created_at 
    FROM activity_events 
    WHERE user_id = ?
  `;
  
  const params = [userId];
  
  // Add type filter if specified
  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }
  
  // Add cursor-based pagination
  if (cursor) {
    query += ' AND id < ?';
    params.push(cursor);
  }
  
  // Order by ID descending and limit results
  query += ' ORDER BY id DESC LIMIT ?';
  params.push(limit + 1); // Fetch one extra to check if there are more results
  
  const stmt = db.prepare(query);
  const activities = stmt.all(...params);
  
  // Check if there are more results
  const hasMore = activities.length > limit;
  if (hasMore) {
    activities.pop(); // Remove the extra result
  }
  
  // Determine next cursor
  const nextCursor = hasMore && activities.length > 0 
    ? activities[activities.length - 1].id.toString() 
    : null;
  
  return Promise.resolve({
    activities,
    pagination: {
      limit,
      hasMore,
      nextCursor
    }
  });
}

/**
 * Create a new activity event
 * @param {Object} activity - Activity data
 * @param {number} activity.user_id - User ID
 * @param {string} activity.type - Activity type
 * @param {string} [activity.description] - Activity description
 * @returns {Promise<Object>} Created activity
 */
async function createActivity({ user_id, type, description }) {
  const stmt = db.prepare(`
    INSERT INTO activity_events (user_id, type, description) 
    VALUES (?, ?, ?)
  `);
  
  const result = stmt.run(user_id, type, description || null);
  
  const createdActivity = db.prepare(
    'SELECT id, user_id, type, description, created_at FROM activity_events WHERE id = ?'
  ).get(result.lastInsertRowid);
  
  return Promise.resolve(createdActivity);
}

module.exports = {
  getUserActivities,
  createActivity
};