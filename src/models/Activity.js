'use strict';
const { z } = require('zod');

/**
 * Activity event schema for validation
 */
const ActivitySchema = z.object({
  id: z.number().int().positive(),
  user_id: z.number().int().positive(),
  type: z.string().min(1),
  description: z.string().nullable(),
  created_at: z.string()
});

/**
 * Query parameters schema for activity retrieval
 */
const ActivityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  type: z.string().optional()
});

module.exports = {
  ActivitySchema,
  ActivityQuerySchema
};