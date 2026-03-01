'use strict';
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../../demo.db'));

/**
 * Encodes cursor data into a base64 token
 * @param {Object} cursorData - Object containing timestamp and id
 * @returns {string} Base64 encoded cursor token
 */
function encodeCursor(cursorData) {
  return Buffer.from(JSON.stringify(cursorData)).toString('base64');
}

/**
 * Decodes base64 cursor token back to cursor data
 * @param {string} cursor - Base64 encoded cursor token
 * @returns {Object|null} Decoded cursor data or null if invalid
 */
function decodeCursor(cursor) {
  try {
    if (!cursor) return null;
    const decoded = Buffer.from(cursor, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded);
    
    // Validate cursor structure
    if (!parsed || typeof parsed !== 'object' || !parsed.created_at || !parsed.id) {
      return null;
    }
    
    return parsed;
  } catch (error) {
    return null;
  }
}

/**
 * Queries user activities with cursor-based pagination
 * @param {number} userId - The user ID to query activities for
 * @param {Object} options - Query options
 * @param {number} [options.limit=10] - Maximum number of results to return
 * @param {string} [options.cursor] - Cursor token for pagination
 * @returns {Promise<Object>} Promise resolving to activities result
 */
function getUserActivities(userId, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const { limit = 10, cursor } = options;
      
      // Validate inputs
      if (!userId || typeof userId !== 'number') {
        throw new Error('Invalid user ID');
      }
      
      if (limit <= 0 || limit > 100) {
        throw new Error('Limit must be between 1 and 100');
      }
      
      let query = `
        SELECT id, user_id, type, description, created_at
        FROM activity_events
        WHERE user_id = ?
      `;
      let params = [userId];
      
      // Handle cursor-based pagination
      if (cursor) {
        const cursorData = decodeCursor(cursor);
        if (!cursorData) {
          throw new Error('Invalid cursor token');
        }
        
        // Use composite cursor (timestamp + id) for stable pagination
        query += ` AND (created_at < ? OR (created_at = ? AND id < ?))`;
        params.push(cursorData.created_at, cursorData.created_at, cursorData.id);
      }
      
      // Sort by timestamp descending (newest first), then by id descending for ties
      query += ` ORDER BY created_at DESC, id DESC LIMIT ?`;
      params.push(limit + 1); // Fetch one extra to determine if there are more results
      
      const stmt = db.prepare(query);
      const results = stmt.all(...params);
      
      // Check if there are more results
      const hasMore = results.length > limit;
      const activities = hasMore ? results.slice(0, limit) : results;
      
      // Generate next cursor if there are more results
      let nextCursor = null;
      if (hasMore && activities.length > 0) {
        const lastActivity = activities[activities.length - 1];
        nextCursor = encodeCursor({
          created_at: lastActivity.created_at,
          id: lastActivity.id
        });
      }
      
      resolve({
        activities,
        pagination: {
          hasMore,
          nextCursor,
          limit
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Creates a new activity event for a user
 * @param {Object} activityData - Activity data
 * @param {number} activityData.userId - User ID
 * @param {string} activityData.type - Activity type
 * @param {string} [activityData.description] - Activity description
 * @returns {Promise<Object>} Promise resolving to created activity
 */
function createActivity({ userId, type, description }) {
  return new Promise((resolve, reject) => {
    try {
      if (!userId || !type) {
        throw new Error('userId and type are required');
      }
      
      const stmt = db.prepare(`
        INSERT INTO activity_events (user_id, type, description)
        VALUES (?, ?, ?)
      `);
      
      const result = stmt.run(userId, type, description || null);
      
      const createdActivity = db.prepare(`
        SELECT id, user_id, type, description, created_at
        FROM activity_events
        WHERE id = ?
      `).get(result.lastInsertRowid);
      
      resolve(createdActivity);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Gets total count of activities for a user
 * @param {number} userId - The user ID
 * @returns {Promise<number>} Promise resolving to activity count
 */
function getUserActivityCount(userId) {
  return new Promise((resolve, reject) => {
    try {
      if (!userId || typeof userId !== 'number') {
        throw new Error('Invalid user ID');
      }
      
      const stmt = db.prepare('SELECT COUNT(*) as count FROM activity_events WHERE user_id = ?');
      const result = stmt.get(userId);
      
      resolve(result.count);
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  getUserActivities,
  createActivity,
  getUserActivityCount,
  encodeCursor,
  decodeCursor
};