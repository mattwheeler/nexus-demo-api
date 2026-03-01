'use strict';
const { z } = require('zod');

/**
 * Common activity event types
 */
const ACTIVITY_EVENT_TYPES = {
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  RESOURCE_CREATED: 'resource.created',
  RESOURCE_UPDATED: 'resource.updated',
  RESOURCE_DELETED: 'resource.deleted',
  RESOURCE_VIEWED: 'resource.viewed',
  SYSTEM_EVENT: 'system.event'
};

/**
 * Activity event actor schema
 * Represents the entity that performed the action
 */
const actorSchema = z.object({
  /** Unique identifier for the actor */
  id: z.string().min(1, 'Actor ID is required'),
  /** Type of actor (e.g., 'user', 'system', 'service') */
  type: z.string().min(1, 'Actor type is required'),
  /** Display name for the actor */
  name: z.string().optional(),
  /** Additional actor metadata */
  metadata: z.record(z.any()).optional()
});

/**
 * Activity event subject schema
 * Represents the primary entity that was acted upon
 */
const subjectSchema = z.object({
  /** Unique identifier for the subject */
  id: z.string().min(1, 'Subject ID is required'),
  /** Type of subject (e.g., 'user', 'post', 'comment') */
  type: z.string().min(1, 'Subject type is required'),
  /** Display name for the subject */
  name: z.string().optional(),
  /** Additional subject metadata */
  metadata: z.record(z.any()).optional()
});

/**
 * Activity event target schema
 * Represents the secondary entity involved in the action (optional)
 */
const targetSchema = z.object({
  /** Unique identifier for the target */
  id: z.string().min(1, 'Target ID is required'),
  /** Type of target (e.g., 'group', 'project', 'organization') */
  type: z.string().min(1, 'Target type is required'),
  /** Display name for the target */
  name: z.string().optional(),
  /** Additional target metadata */
  metadata: z.record(z.any()).optional()
}).optional();

/**
 * Complete activity event validation schema
 */
const activityEventSchema = z.object({
  /** Unique identifier for the activity event */
  id: z.string().uuid('ID must be a valid UUID').optional(),
  /** Type of activity event (e.g., 'user.created', 'resource.updated') */
  type: z.string().min(1, 'Event type is required'),
  /** ISO 8601 timestamp when the event occurred */
  timestamp: z.string().datetime('Timestamp must be a valid ISO 8601 date').optional(),
  /** The entity that performed the action */
  actor: actorSchema,
  /** The primary entity that was acted upon */
  subject: subjectSchema,
  /** The secondary entity involved in the action (optional) */
  target: targetSchema,
  /** Additional event-specific data */
  metadata: z.record(z.any()).optional()
});

/**
 * Pagination metadata schema for API responses
 */
const paginationMetaSchema = z.object({
  /** Whether there are more results available */
  hasMore: z.boolean(),
  /** Cursor for fetching the next page of results */
  nextCursor: z.string().optional(),
  /** Total count of items (optional, may be expensive to compute) */
  total: z.number().int().min(0).optional(),
  /** Current page size */
  limit: z.number().int().min(1).optional(),
  /** Current offset or page number */
  offset: z.number().int().min(0).optional()
});

/**
 * API response wrapper for activity events with pagination
 */
const activityEventResponseSchema = z.object({
  /** Array of activity events */
  data: z.array(activityEventSchema),
  /** Pagination metadata */
  pagination: paginationMetaSchema
});

/**
 * Single activity event response schema
 */
const singleActivityEventResponseSchema = z.object({
  /** Single activity event */
  data: activityEventSchema
});

module.exports = {
  ACTIVITY_EVENT_TYPES,
  actorSchema,
  subjectSchema,
  targetSchema,
  activityEventSchema,
  paginationMetaSchema,
  activityEventResponseSchema,
  singleActivityEventResponseSchema
};