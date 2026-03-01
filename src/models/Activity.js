'use strict';
const Database = require('better-sqlite3');
const path = require('path');
const { z } = require('zod');

const db = new Database(path.join(__dirname, '../../demo.db'));

// Activity schema for validation
const ActivitySchema = z.object({
  id: z.number().int().positive(),
  user_id: z.number().int().positive(),
  type: z.string().min(1).max(50),
  description: z.string().optional(),
  created_at: z.string()
});

const CreateActivitySchema = z.object({
  user_id: z.number().int().positive(),
  type: z.string().min(1).max(50),
  description: z.string().optional()
});

/**
 * Retrieve activities for a user with pagination support
 * @param {string|number} userId - User ID
 * @param {Object} options - Query options
 * @param {number} [options.limit=10] - Number of activities to retrieve
 * @param {Object} [options.cursor] - Cursor object with id and created_at
 * @returns {Promise<Array>} Array of activity objects
 */
function getActivities(userId, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const { limit = 10, cursor } = options;
      
      let query = 'SELECT * FROM activity_events WHERE user_id = ?';
      const params = [userId];
      
      // Add cursor-based pagination
      if (cursor) {
        query += ' AND (created_at < ? OR (created_at = ? AND id < ?))';
        params.push(cursor.created_at, cursor.created_at, cursor.id);
      }
      
      query += ' ORDER BY created_at DESC, id DESC LIMIT ?';
      params.push(limit);
      
      const stmt = db.prepare(query);
      const activities = stmt.all(...params);
      
      // Validate each activity against schema
      const validatedActivities = activities.map(activity => {
        const result = ActivitySchema.safeParse(activity);
        if (!result.success) {
          throw new Error(`Invalid activity data: ${result.error.message}`);
        }
        return result.data;
      });
      
      resolve(validatedActivities);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Create a new activity event
 * @param {Object} activityData - Activity data
 * @param {number} activityData.user_id - User ID
 * @param {string} activityData.type - Activity type
 * @param {string} [activityData.description] - Activity description
 * @returns {Promise<Object>} Created activity object
 */
function createActivity(activityData) {
  return new Promise((resolve, reject) => {
    try {
      // Validate input data
      const result = CreateActivitySchema.safeParse(activityData);
      if (!result.success) {
        const error = new Error('Invalid activity data');
        error.details = result.error.issues;
        return reject(error);
      }
      
      const { user_id, type, description } = result.data;
      
      const stmt = db.prepare(
        'INSERT INTO activity_events (user_id, type, description) VALUES (?, ?, ?)'
      );
      
      const insertResult = stmt.run(user_id, type, description || null);
      
      // Retrieve the created activity
      const selectStmt = db.prepare(
        'SELECT * FROM activity_events WHERE id = ?'
      );
      
      const activity = selectStmt.get(insertResult.lastInsertRowid);
      
      if (!activity) {
        return reject(new Error('Failed to retrieve created activity'));
      }
      
      // Validate created activity
      const validationResult = ActivitySchema.safeParse(activity);
      if (!validationResult.success) {
        return reject(new Error(`Created activity validation failed: ${validationResult.error.message}`));
      }
      
      resolve(validationResult.data);
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  getActivities,
  createActivity,
  ActivitySchema,
  CreateActivitySchema
};