'use strict';
const { z } = require('zod');

/**
 * Actor schema for activity events
 * @typedef {Object} Actor
 * @property {string} id - Unique identifier for the actor
 * @property {string} type - Type of the actor (e.g., 'user', 'system')
 * @property {string} [displayName] - Optional display name for the actor
 */
const ActorSchema = z.object({
  id: z.string().min(1, 'Actor id is required'),
  type: z.string().min(1, 'Actor type is required'),
  displayName: z.string().optional()
});

/**
 * Activity schema for activity events
 * @typedef {Object} Activity
 * @property {string} id - Unique identifier for the activity
 * @property {string} type - Type of activity event
 * @property {string} timestamp - ISO-8601 UTC timestamp
 * @property {string} subjectUserId - ID of the user who is the subject of the activity
 * @property {Actor} actor - Actor who performed the activity
 */
const ActivitySchema = z.object({
  id: z.string().min(1, 'Activity id is required'),
  type: z.string().min(1, 'Activity type is required'),
  timestamp: z.string().datetime({ message: 'Timestamp must be a valid ISO-8601 UTC format' }),
  subjectUserId: z.string().min(1, 'Subject user ID is required'),
  actor: ActorSchema
});

/**
 * Validates activity data against the schema
 * @param {Object} activityData - The activity data to validate
 * @returns {Object} Validation result with success flag and data or error
 */
function validateActivity(activityData) {
  return ActivitySchema.safeParse(activityData);
}

/**
 * Validates actor data against the schema
 * @param {Object} actorData - The actor data to validate
 * @returns {Object} Validation result with success flag and data or error
 */
function validateActor(actorData) {
  return ActorSchema.safeParse(actorData);
}

module.exports = {
  ActivitySchema,
  ActorSchema,
  validateActivity,
  validateActor
};