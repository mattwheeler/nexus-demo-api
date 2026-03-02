'use strict';
const { z } = require('zod');

/**
 * Validation schema for activity query parameters
 */
const activityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
  event_type: z.string().optional()
});

module.exports = { activityQuerySchema };