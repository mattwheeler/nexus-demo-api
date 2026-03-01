'use strict';
const { z } = require('zod');

/**
 * Activity event types enum
 */
const ACTIVITY_TYPES = {
  USER_CREATED: 'user_created',
  USER_UPDATED: 'user_updated',
  USER_DELETED: 'user_deleted',
  LOGIN: 'login',
  LOGOUT: 'logout',
  POST_CREATED: 'post_created',
  POST_UPDATED: 'post_updated',
  POST_DELETED: 'post_deleted',
  COMMENT_CREATED: 'comment_created',
  COMMENT_UPDATED: 'comment_updated',
  COMMENT_DELETED: 'comment_deleted',
  RESOURCE_ACCESSED: 'resource_accessed',
  SYSTEM_EVENT: 'system_event'
};

/**
 * Activity pagination query parameters schema
 */
const activityQuerySchema = z.object({
  /** User ID to filter activities for */
  userId: z.string().optional(),
  /** Activity type to filter by */
  type: z.enum(Object.values(ACTIVITY_TYPES)).optional(),
  /** Maximum number of results to return (1-100) */
  limit: z.coerce.number().int().min(1).max(100).default(20),
  /** Cursor for pagination */
  cursor: z.string().optional(),
  /** Start date for filtering (ISO 8601) */
  startDate: z.string().datetime().optional(),
  /** End date for filtering (ISO 8601) */
  endDate: z.string().datetime().optional()
});

/**
 * Activity event data schema
 */
const activityEventDataSchema = z.object({
  /** Unique identifier for the activity */
  id: z.string().uuid().optional(),
  /** User ID associated with the activity */
  userId: z.string().min(1, 'User ID is required'),
  /** Type of activity */
  type: z.enum(Object.values(ACTIVITY_TYPES)),
  /** Human-readable description of the activity */
  description: z.string().min(1, 'Description is required'),
  /** ISO 8601 timestamp when the activity occurred */
  timestamp: z.string().datetime().optional(),
  /** Additional metadata for the activity */
  metadata: z.record(z.any()).optional()
});

/**
 * Pagination metadata schema
 */
const paginationSchema = z.object({
  /** Whether there are more results available */
  hasMore: z.boolean(),
  /** Cursor for the next page */
  nextCursor: z.string().optional(),
  /** Total count (optional, may be expensive to compute) */
  total: z.number().int().min(0).optional()
});

/**
 * Activity response schema with pagination
 */
const activityResponseSchema = z.object({
  /** Array of activity events */
  data: z.array(activityEventDataSchema),
  /** Pagination information */
  pagination: paginationSchema
});

module.exports = {
  ACTIVITY_TYPES,
  activityQuerySchema,
  activityEventDataSchema,
  paginationSchema,
  activityResponseSchema
};