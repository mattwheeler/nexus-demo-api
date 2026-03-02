'use strict';

/**
 * Middleware to validate query parameters against a Zod schema
 * @param {Object} schema - Zod schema to validate against
 * @returns {Function} Express middleware function
 */
function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(422).json({
        error: 'Validation failed',
        issues: result.error.issues.map(i => ({ 
          path: i.path.join('.'), 
          message: i.message 
        }))
      });
    }
    req.query = result.data;
    next();
  };
}

module.exports = { validateQuery };