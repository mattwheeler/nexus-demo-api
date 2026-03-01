'use strict';
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../../demo.db'));

/**
 * Retrieves user activities with cursor-based pagination
 * @param {number} userId - User ID to fetch activities for
 * @param {Object} options - Query options
 * @param {string|null} options.cursor - Cursor for pagination (activity ID)
 * @param {number} options.limit - Maximum number of activities to return
 * @returns {Promise<Object>} Promise resolving to activities and pagination info
 */
async function getUserActivities(userId, options = {}) {
  const { cursor = null, limit = 20 } = options;
  const actualLimit = Math.min(Math.max(1, limit), 100); // Ensure limit is between 1 and 100
  
  // Build the query based on whether we have a cursor
  let query = 'SELECT * FROM activity_events WHERE user_id = ?';
  let params = [userId];
  
  if (cursor) {
    // For cursor-based pagination, get activities after the cursor
    query += ' AND id > ?';
    params.push(cursor);
  }
  
  query += ' ORDER BY id ASC LIMIT ?';
  params.push(actualLimit + 1); // Fetch one extra to check if there are more
  
  const stmt = db.prepare(query);
  const activities = stmt.all(...params);
  
  // Check if there are more activities
  const hasMore = activities.length > actualLimit;
  const resultActivities = hasMore ? activities.slice(0, actualLimit) : activities;
  
  // Determine next cursor
  const nextCursor = hasMore && resultActivities.length > 0 
    ? resultActivities[resultActivities.length - 1].id.toString() 
    : null;
  
  return {
    activities: resultActivities,
    pagination: {
      cursor: cursor,
      limit: actualLimit,
      hasMore: hasMore,
      nextCursor: nextCursor
    }
  };
}

/**
 * Creates a new activity event for a user
 * @param {Object} activityData - Activity event data
 * @param {number} activityData.user_id - User ID
 * @param {string} activityData.type - Activity type
 * @param {string} activityData.description - Activity description
 * @returns {Promise<Object>} Promise resolving to the created activity
 */
async function createActivity({ user_id, type, description }) {
  const stmt = db.prepare(
    'INSERT INTO activity_events (user_id, type, description) VALUES (?, ?, ?)'
  );
  const result = stmt.run(user_id, type, description);
  
  const getStmt = db.prepare('SELECT * FROM activity_events WHERE id = ?');
  const activity = getStmt.get(result.lastInsertRowid);
  
  return activity;
}

/**
 * Gets a single activity event by ID
 * @param {number} id - Activity ID
 * @returns {Promise<Object|null>} Promise resolving to activity or null if not found
 */
async function getActivity(id) {
  const stmt = db.prepare('SELECT * FROM activity_events WHERE id = ?');
  const activity = stmt.get(id);
  return activity || null;
}

module.exports = {
  getUserActivities,
  createActivity,
  getActivity
};