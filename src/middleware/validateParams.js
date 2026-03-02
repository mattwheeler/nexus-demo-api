'use strict';
const { z } = require('zod');

/**
 * Validates request parameters using Zod schemas
 * @param {Object} schemas - Object containing validation schemas
 * @param {z.ZodSchema} [schemas.params] - Schema for validating req.params
 * @param {z.ZodSchema} [schemas.query] - Schema for validating req.query
 * @param {z.ZodSchema} [schemas.body] - Schema for validating req.body
 * @returns {Function} Express middleware function
 */
function validateParams(schemas) {
  return (req, res, next) => {
    const errors = [];

    // Validate params
    if (schemas.params) {
      const paramsResult = schemas.params.safeParse(req.params);
      if (!paramsResult.success) {
        errors.push(...paramsResult.error.issues.map(issue => ({
          field: `params.${issue.path.join('.')}`,
          message: issue.message,
          value: issue.path.reduce((obj, key) => obj?.[key], req.params)
        })));
      } else {
        req.params = paramsResult.data;
      }
    }

    // Validate query
    if (schemas.query) {
      const queryResult = schemas.query.safeParse(req.query);
      if (!queryResult.success) {
        errors.push(...queryResult.error.issues.map(issue => ({
          field: `query.${issue.path.join('.')}`,
          message: issue.message,
          value: issue.path.reduce((obj, key) => obj?.[key], req.query)
        })));
      } else {
        req.query = queryResult.data;
      }
    }

    // Validate body
    if (schemas.body) {
      const bodyResult = schemas.body.safeParse(req.body);
      if (!bodyResult.success) {
        errors.push(...bodyResult.error.issues.map(issue => ({
          field: `body.${issue.path.join('.')}`,
          message: issue.message,
          value: issue.path.reduce((obj, key) => obj?.[key], req.body)
        })));
      } else {
        req.body = bodyResult.data;
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Invalid input',
        details: errors
      });
    }

    next();
  };
}

/**
 * Validates user ID parameter as UUID format
 * @returns {Function} Express middleware function
 */
function validateUserId() {
  return validateParams({
    params: z.object({
      id: z.string().uuid({ message: 'User ID must be a valid UUID' })
    })
  });
}

/**
 * Validates optional cursor query parameter
 * @returns {Function} Express middleware function
 */
function validateCursor() {
  return validateParams({
    query: z.object({
      cursor: z.string().optional()
        .refine(val => !val || val.length > 0, {
          message: 'Cursor cannot be empty string'
        })
    })
  });
}

/**
 * Validates user ID parameter and optional cursor query parameter
 * @returns {Function} Express middleware function
 */
function validateUserActivity() {
  return validateParams({
    params: z.object({
      id: z.string().uuid({ message: 'User ID must be a valid UUID' })
    }),
    query: z.object({
      cursor: z.string().optional()
        .refine(val => !val || val.length > 0, {
          message: 'Cursor cannot be empty string'
        })
    })
  });
}

module.exports = {
  validateParams,
  validateUserId,
  validateCursor,
  validateUserActivity
};