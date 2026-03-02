'use strict';
const Database = require('better-sqlite3');
const path = require('path');

// Reuse the same database instance pattern as User.js
const db = new Database(path.join(__dirname, '../../demo.db'));

/**
 * Checks if a user exists in the database by their ID
 * Uses an efficient SELECT 1 query for existence check only
 * 
 * @param {number} userId - The user ID to check for existence
 * @returns {Promise<boolean>} Promise that resolves to true if user exists, false otherwise
 * @throws {Error} If database query fails
 */
async function userExists(userId) {
  try {
    // Use SELECT 1 for efficient existence check - only returns 1 or nothing
    const result = db.prepare('SELECT 1 FROM users WHERE id = ? LIMIT 1').get(userId);
    return result !== undefined;
  } catch (error) {
    // Wrap database errors with more context
    const dbError = new Error(`Database error while checking user existence: ${error.message}`);
    dbError.status = 500;
    dbError.originalError = error;
    throw dbError;
  }
}

/**
 * Validates that a user exists and throws appropriate error if not
 * Useful for integration with route handlers that need 404 responses
 * 
 * @param {number} userId - The user ID to validate
 * @returns {Promise<void>} Promise that resolves if user exists
 * @throws {Error} 404 error if user doesn't exist, 500 error for database issues
 */
async function validateUserExists(userId) {
  try {
    const exists = await userExists(userId);
    if (!exists) {
      const notFoundError = new Error('User not found');
      notFoundError.status = 404;
      throw notFoundError;
    }
  } catch (error) {
    // Re-throw existing errors (including our 404)
    if (error.status) {
      throw error;
    }
    // Handle unexpected errors
    const dbError = new Error(`Database error while validating user: ${error.message}`);
    dbError.status = 500;
    dbError.originalError = error;
    throw dbError;
  }
}

module.exports = {
  userExists,
  validateUserExists
};