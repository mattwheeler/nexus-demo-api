'use strict';

/**
 * Middleware factory for request validation using Zod schemas
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware function
 */
function validateRequest(schema) {
  return (req, res, next) => {
    // For GET requests, validate query parameters
    const dataToValidate = req.method === 'GET' ? req.query : req.body;
    
    const result = schema.safeParse(dataToValidate);
    if (!result.success) {
      return res.status(422).json({
        error: 'Validation failed',
        issues: result.error.issues.map(i => ({
          path: i.path.join('.'),
          message: i.message
        })),
      });
    }
    
    // For GET requests, attach validated data to req.query
    // For other methods, attach to req.body
    if (req.method === 'GET') {
      req.query = result.data;
    } else {
      req.body = result.data;
    }
    
    next();
  };
}

module.exports = { validateRequest };