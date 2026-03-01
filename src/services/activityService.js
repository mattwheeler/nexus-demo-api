'use strict';
const Database = require('better-sqlite3');
const path = require('path');
const { getUser } = require('../models/User');

const db = new Database(path.join(__dirname, '../../demo.db'));

/**
 * Retrieves activity events for a specific user with pagination
 * @param {string|number} userId - The user ID
 * @param {Object} options - Query options
 * @param {number} options.limit - Number of events to return (default: 20, max: 100)
 * @param {number} options.offset - Number of events to skip (default: 0)
 * @param {string} [options.type] - Filter by event type
 * @returns {Promise<Object>} Activity data with pagination info
 * @throws {Error} When user not found or database error
 */
async function getUserActivity(userId, options = {}) {
  const { limit = 20, offset = 0, type } = options;
  
  // First check if user exists
  const user = await getUser(userId);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  try {
    let query = 'SELECT * FROM activity_events WHERE user_id = ?';
    let countQuery = 'SELECT COUNT(*) as total FROM activity_events WHERE user_id = ?';
    const params = [userId];
    const countParams = [userId];

    // Add type filter if specified
    if (type) {
      query += ' AND type = ?';
      countQuery += ' AND type = ?';
      params.push(type);
      countParams.push(type);
    }

    // Add ordering and pagination
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    // Get the activity events
    const activities = db.prepare(query).all(...params);
    
    // Get total count for pagination
    const { total } = db.prepare(countQuery).get(...countParams);
    
    return {
      activities,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total
      }
    };
  } catch (error) {
    // Re-throw with 500 status if not already set
    if (!error.status) {
      error.status = 500;
    }
    throw error;
  }
}

module.exports = {
  getUserActivity
};