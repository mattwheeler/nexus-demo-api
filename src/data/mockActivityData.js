'use strict';
const { ACTIVITY_TYPES } = require('../types/activity');

/**
 * Generate mock activity events for testing
 * @param {string} userId - User ID to generate activities for
 * @returns {Array} Array of activity events
 */
function generateMockActivities(userId) {
  const activities = [];
  const now = new Date();
  
  // Generate 30 sample activities with decreasing timestamps
  const activityTemplates = [
    { type: ACTIVITY_TYPES.LOGIN, description: 'User logged in' },
    { type: ACTIVITY_TYPES.PROFILE_VIEWED, description: 'Profile page viewed' },
    { type: ACTIVITY_TYPES.SETTINGS_UPDATED, description: 'Account settings updated' },
    { type: ACTIVITY_TYPES.NOTIFICATION_SENT, description: 'Welcome email sent' },
    { type: ACTIVITY_TYPES.EMAIL_VERIFIED, description: 'Email address verified' },
    { type: ACTIVITY_TYPES.PASSWORD_CHANGED, description: 'Password updated successfully' },
    { type: ACTIVITY_TYPES.LOGOUT, description: 'User logged out' },
    { type: ACTIVITY_TYPES.LOGIN, description: 'User logged in from mobile device' },
    { type: ACTIVITY_TYPES.PROFILE_VIEWED, description: 'Profile settings accessed' },
    { type: ACTIVITY_TYPES.SETTINGS_UPDATED, description: 'Privacy preferences updated' }
  ];
  
  for (let i = 0; i < 30; i++) {
    const template = activityTemplates[i % activityTemplates.length];
    const timestamp = new Date(now.getTime() - (i * 1000 * 60 * 15)); // 15 minutes apart
    
    activities.push({
      id: `act_${userId}_${String(i + 1).padStart(3, '0')}`,
      userId,
      type: template.type,
      description: `${template.description} (#${i + 1})`,
      metadata: {
        userAgent: i % 3 === 0 ? 'Mozilla/5.0 (iPhone)' : 'Mozilla/5.0 (Windows)',
        ipAddress: `192.168.1.${(i % 254) + 1}`,
        sessionId: `sess_${Math.random().toString(36).substring(2, 15)}`
      },
      timestamp: timestamp.toISOString()
    });
  }
  
  return activities;
}

/**
 * In-memory storage for mock activities by user ID
 */
const mockActivitiesStore = new Map();

/**
 * Get mock activities for a user, generating them if they don't exist
 * @param {string} userId - User ID
 * @returns {Array} Array of activity events
 */
function getMockActivitiesForUser(userId) {
  if (!mockActivitiesStore.has(userId)) {
    mockActivitiesStore.set(userId, generateMockActivities(userId));
  }
  return mockActivitiesStore.get(userId);
}

/**
 * Clear mock activities for a user (useful for testing)
 * @param {string} userId - User ID
 */
function clearMockActivitiesForUser(userId) {
  mockActivitiesStore.delete(userId);
}

/**
 * Clear all mock activities (useful for testing)
 */
function clearAllMockActivities() {
  mockActivitiesStore.clear();
}

module.exports = {
  generateMockActivities,
  getMockActivitiesForUser,
  clearMockActivitiesForUser,
  clearAllMockActivities
};