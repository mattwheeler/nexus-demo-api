'use strict';
const { z } = require('zod');

/**
 * Activity event data model schema
 */
const ActivityEventSchema = z.object({
  id: z.number().int().positive(),
  user_id: z.number().int().positive(),
  type: z.string().min(1).max(100),
  description: z.string().nullable().optional(),
  created_at: z.string()
});

/**
 * Query parameters schema for activity endpoint
 */
const ActivityQuerySchema = z.object({
  limit: z.string().optional().transform(val => {
    if (!val) return 10;
    const num = parseInt(val, 10);
    return isNaN(num) ? 10 : Math.min(Math.max(num, 1), 100);
  }),
  cursor: z.string().optional(),
  type: z.string().optional()
}).transform(data => ({
  limit: data.limit,
  cursor: data.cursor,
  type: data.type
}));

module.exports = {
  ActivityEventSchema,
  ActivityQuerySchema
};