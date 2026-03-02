'use strict';
const { getUser } = require('../models/User');

/**
 * Verifies if a user exists
 * @param {string|number} userId - User ID to verify
 * @returns {Promise<boolean>} True if user exists, false otherwise
 */
async function userExists(userId) {
  const user = await getUser(userId);
  return !!user;
}

module.exports = { userExists };