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
  PASSWORD_CHANGED: 'password_changed',
  EMAIL_VERIFIED: 'email_verified',
  PROFILE_VIEWED: 'profile_viewed',
  SETTINGS_UPDATED: 'settings_updated',
  NOTIFICATION_SENT: 'notification_sent'
};

/**
 * Zod schema for activity event validation
 */
const ActivityEventSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.enum(Object.values(ACTIVITY_TYPES)),
  description: z.string(),
  metadata: z.record(z.any()).optional(),
  timestamp: z.string().datetime()
});

/**
 * Pagination cursor schema
 */
const PaginationCursorSchema = z.object({
  timestamp: z.string().datetime(),
  id: z.string()
});

/**
 * Pagination options schema
 */
const PaginationOptionsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20)
});

/**
 * Activity response schema
 */
const ActivityResponseSchema = z.object({
  activities: z.array(ActivityEventSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean()
});

module.exports = {
  ACTIVITY_TYPES,
  ActivityEventSchema,
  PaginationCursorSchema,
  PaginationOptionsSchema,
  ActivityResponseSchema
};