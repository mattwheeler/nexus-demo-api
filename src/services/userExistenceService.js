'use strict';
const { getUser } = require('../models/User');

/**
 * Checks if a user exists by ID
 * @param {number} userId - The user ID to check
 * @returns {Promise<boolean>} True if user exists, false otherwise
 */
async function checkUserExists(userId) {
  try {
    const user = await getUser(userId);
    return user !== null;
  } catch (error) {
    // Log error and return false to indicate user doesn't exist
    console.error('Error checking user existence:', error);
    return false;
  }
}

module.exports = { checkUserExists };