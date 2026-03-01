'use strict';
const { z } = require('zod');

/**
 * Activity event type enumeration
 */
const ActivityType = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  VIEW: 'view',
  DOWNLOAD: 'download',
  UPLOAD: 'upload',
  SHARE: 'share',
  COMMENT: 'comment'
};

/**
 * Schema for activity event data
 */
const ActivityEventSchema = z.object({
  id: z.number().int().positive(),
  user_id: z.number().int().positive(),
  type: z.enum(Object.values(ActivityType)),
  description: z.string().nullable(),
  created_at: z.string().datetime()
});

/**
 * Schema for creating new activity events
 */
const CreateActivitySchema = z.object({
  user_id: z.number().int().positive(),
  type: z.enum(Object.values(ActivityType)),
  description: z.string().min(1).max(500).optional()
});

/**
 * Schema for activity query parameters
 */
const ActivityQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

/**
 * Schema for activity response pagination metadata
 */
const PaginationSchema = z.object({
  cursor: z.string().nullable(),
  limit: z.number().int().positive(),
  has_more: z.boolean(),
  next_cursor: z.string().nullable()
});

/**
 * Schema for complete activity response
 */
const ActivityResponseSchema = z.object({
  data: z.array(ActivityEventSchema),
  pagination: PaginationSchema
});

module.exports = {
  ActivityType,
  ActivityEventSchema,
  CreateActivitySchema,
  ActivityQuerySchema,
  PaginationSchema,
  ActivityResponseSchema
};