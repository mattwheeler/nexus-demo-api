'use strict';
const Database = require('better-sqlite3');
const path = require('path');
const { encodeCursor, decodeCursor } = require('../utils/pagination');
const { userExists } = require('./userService');

const db = new Database(path.join(__dirname, '../../demo.db'));

/**
 * Retrieves user activity events with cursor-based pagination
 * @param {string|number} userId - User ID to fetch activities for
 * @param {string} [cursor] - Optional cursor for pagination
 * @param {number} [limit=10] - Number of events to fetch (max 10)
 * @returns {Promise<{events: Array, nextCursor: string|null}>} Activity events and next cursor
 * @throws {Error} If user doesn't exist or cursor is invalid
 */
async function getUserActivityEvents(userId, cursor = null, limit = 10) {
  // Validate user exists
  const exists = await userExists(userId);
  if (!exists) {
    throw new Error('User not found');
  }

  // Ensure limit doesn't exceed 10
  const actualLimit = Math.min(limit, 10);
  
  let query = `
    SELECT id, user_id, type, description, created_at
    FROM activity_events
    WHERE user_id = ?
  `;
  
  const params = [userId];
  
  // Apply cursor-based pagination if cursor is provided
  if (cursor) {
    try {
      const { timestamp, id } = decodeCursor(cursor);
      query += ` AND (created_at < ? OR (created_at = ? AND id < ?))`;
      params.push(timestamp, timestamp, id);
    } catch (error) {
      throw new Error('Invalid cursor');
    }
  }
  
  // Order by timestamp descending, then by ID descending
  query += ` ORDER BY created_at DESC, id DESC LIMIT ?`;
  params.push(actualLimit + 1); // Fetch one extra to check if there's more data
  
  const stmt = db.prepare(query);
  const results = stmt.all(...params);
  
  // Determine if there are more results
  const hasMore = results.length > actualLimit;
  const events = hasMore ? results.slice(0, actualLimit) : results;
  
  // Generate next cursor if there are more results
  let nextCursor = null;
  if (hasMore) {
    const lastEvent = events[events.length - 1];
    nextCursor = encodeCursor(lastEvent.created_at, lastEvent.id);
  }
  
  return {
    events,
    nextCursor
  };
}

module.exports = { getUserActivityEvents };