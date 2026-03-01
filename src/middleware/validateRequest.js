'use strict';
const { createValidationError } = require('../utils/errorHelpers');

/**
 * Request validation middleware using Zod schemas
 * @param {Object} schema - Zod validation schema
 * @returns {Function} Express middleware function
 */
function validateRequest(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(createValidationError(result.error));
    }
    req.body = result.data;
    next();
  };
}

module.exports = { validateRequest };