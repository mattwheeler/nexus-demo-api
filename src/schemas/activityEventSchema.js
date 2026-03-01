'use strict';
const { z } = require('zod');

/**
 * Activity Event Validation Schemas
 * 
 * This module provides Zod validation schemas for activity events.
 * These schemas ensure data integrity and provide runtime validation.
 */

/**
 * Schema for activity actor validation
 */
const activityActorSchema = z.object({
  id: z.string().min(1, 'Actor ID is required'),
  type: z.enum(['user', 'system', 'service', 'api'], {
    errorMap: () => ({ message: 'Actor type must be one of: user, system, service, api' })
  }),
  name: z.string().optional(),
  email: z.string().email('Invalid email format').optional()
}).strict();

/**
 * Schema for activity subject validation
 */
const activitySubjectSchema = z.object({
  id: z.string().min(1, 'Subject ID is required'),
  type: z.string().min(1, 'Subject type is required'),
  name: z.string().optional(),
  properties: z.record(z.any()).optional()
}).strict();

/**
 * Schema for activity target validation
 */
const activityTargetSchema = z.object({
  id: z.string().min(1, 'Target ID is required'),
  type: z.string().min(1, 'Target type is required'),
  name: z.string().optional(),
  properties: z.record(z.any()).optional()
}).strict();

/**
 * Schema for location metadata validation
 */
const locationSchema = z.object({
  country: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional()
}).strict();

/**
 * Schema for activity metadata validation
 */
const activityMetadataSchema = z.object({
  ipAddress: z.string().ip('Invalid IP address').optional(),
  userAgent: z.string().optional(),
  location: locationSchema.optional(),
  sessionId: z.string().optional(),
  requestId: z.string().optional(),
  custom: z.record(z.any()).optional()
}).strict();

/**
 * Complete activity event validation schema
 */
const activityEventSchema = z.object({
  id: z.string().min(1, 'Event ID is required'),
  version: z.string().min(1, 'Schema version is required').default('1.0.0'),
  type: z.string()
    .min(1, 'Activity type is required')
    .regex(
      /^[a-z][a-z0-9]*\.[a-z][a-z0-9]*$/,
      'Activity type must follow format: category.action (lowercase, alphanumeric)'
    ),
  timestamp: z.string().datetime('Invalid ISO 8601 timestamp'),
  actor: activityActorSchema,
  subject: activitySubjectSchema.optional(),
  target: activityTargetSchema.optional(),
  description: z.string().optional(),
  metadata: activityMetadataSchema.optional(),
  recordedAt: z.string().datetime('Invalid ISO 8601 timestamp for recordedAt')
}).strict();

/**
 * Schema for creating new activity events
 * Some fields are optional and will be auto-generated
 */
const createActivityEventSchema = z.object({
  type: z.string()
    .min(1, 'Activity type is required')
    .regex(
      /^[a-z][a-z0-9]*\.[a-z][a-z0-9]*$/,
      'Activity type must follow format: category.action (lowercase, alphanumeric)'
    ),
  actor: activityActorSchema,
  subject: activitySubjectSchema.optional(),
  target: activityTargetSchema.optional(),
  description: z.string().optional(),
  metadata: activityMetadataSchema.optional(),
  timestamp: z.string().datetime('Invalid ISO 8601 timestamp').optional()
}).strict();

/**
 * Schema for querying activity events with filters
 */
const activityEventQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  type: z.string().optional(),
  actorId: z.string().optional(),
  actorType: z.enum(['user', 'system', 'service', 'api']).optional(),
  subjectId: z.string().optional(),
  subjectType: z.string().optional(),
  targetId: z.string().optional(),
  targetType: z.string().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  sortBy: z.enum(['timestamp', 'recordedAt']).default('timestamp'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
}).strict();

/**
 * Validation function for activity events
 * @param {any} data - Data to validate
 * @returns {object} Validation result with success/error information
 */
function validateActivityEvent(data) {
  try {
    const result = activityEventSchema.safeParse(data);
    if (!result.success) {
      return {
        success: false,
        error: 'Validation failed',
        issues: result.error.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code
        }))
      };
    }
    return { success: true, data: result.data };
  } catch (error) {
    return {
      success: false,
      error: 'Validation error',
      message: error.message
    };
  }
}

/**
 * Validation function for creating activity events
 * @param {any} data - Data to validate
 * @returns {object} Validation result with success/error information
 */
function validateCreateActivityEvent(data) {
  try {
    const result = createActivityEventSchema.safeParse(data);
    if (!result.success) {
      return {
        success: false,
        error: 'Validation failed',
        issues: result.error.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code
        }))
      };
    }
    return { success: true, data: result.data };
  } catch (error) {
    return {
      success: false,
      error: 'Validation error',
      message: error.message
    };
  }
}

module.exports = {
  activityEventSchema,
  createActivityEventSchema,
  activityEventQuerySchema,
  activityActorSchema,
  activitySubjectSchema,
  activityTargetSchema,
  activityMetadataSchema,
  validateActivityEvent,
  validateCreateActivityEvent
};
