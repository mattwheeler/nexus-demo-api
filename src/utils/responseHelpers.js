'use strict';
const { logger } = require('./logger');

/**
 * Response helper utilities for consistent API responses
 */

/**
 * Send successful response with data
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {number} [status=200] - HTTP status code
 * @param {string} [message] - Success message
 * @param {Object} [meta] - Additional metadata
 */
function sendSuccess(res, data, status = 200, message = null, meta = {}) {
  const response = {
    success: true,
    data,
    timestamp: new Date().toISOString()
  };
  
  if (message) {
    response.message = message;
  }
  
  // Add metadata if provided
  if (Object.keys(meta).length > 0) {
    response.meta = meta;
  }
  
  // Add request ID if available
  if (res.req.id) {
    response.requestId = res.req.id;
  }
  
  logger.info('Successful response', {
    status,
    endpoint: res.req.originalUrl,
    method: res.req.method,
    dataType: typeof data,
    hasMessage: !!message
  });
  
  return res.status(status).json(response);
}

/**
 * Send paginated response with cursor-based pagination metadata
 * @param {Object} res - Express response object
 * @param {Array} data - Response data array
 * @param {Object} pagination - Pagination information
 * @param {string} [pagination.nextCursor] - Next page cursor
 * @param {string} [pagination.prevCursor] - Previous page cursor
 * @param {number} [pagination.limit] - Items per page limit
 * @param {boolean} [pagination.hasMore] - Whether more items exist
 * @param {string} [message] - Success message
 */
function sendPaginatedSuccess(res, data, pagination = {}, message = null) {
  const meta = {
    pagination: {
      limit: pagination.limit || null,
      hasMore: pagination.hasMore || false,
      nextCursor: pagination.nextCursor || null,
      prevCursor: pagination.prevCursor || null
    }
  };
  
  return sendSuccess(res, data, 200, message, meta);
}

/**
 * Send created response (201) with location header if applicable
 * @param {Object} res - Express response object
 * @param {*} data - Created resource data
 * @param {string} [location] - Location header value
 * @param {string} [message] - Success message
 */
function sendCreated(res, data, location = null, message = 'Resource created successfully') {
  if (location) {
    res.location(location);
  }
  
  return sendSuccess(res, data, 201, message);
}

/**
 * Send no content response (204)
 * @param {Object} res - Express response object
 */
function sendNoContent(res) {
  logger.info('No content response', {
    endpoint: res.req.originalUrl,
    method: res.req.method
  });
  
  return res.status(204).send();
}

/**
 * Send accepted response (202) for async operations
 * @param {Object} res - Express response object
 * @param {*} [data] - Response data
 * @param {string} [message] - Success message
 */
function sendAccepted(res, data = null, message = 'Request accepted for processing') {
  return sendSuccess(res, data, 202, message);
}

/**
 * Validate and send response based on data presence
 * @param {Object} res - Express response object
 * @param {*} data - Data to check and send
 * @param {string} notFoundMessage - Message if data is null/undefined
 * @param {string} [successMessage] - Success message
 */
function sendDataOrNotFound(res, data, notFoundMessage = 'Resource not found', successMessage = null) {
  if (data === null || data === undefined) {
    return res.status(404).json({
      error: notFoundMessage,
      code: 'NOT_FOUND',
      timestamp: new Date().toISOString()
    });
  }
  
  return sendSuccess(res, data, 200, successMessage);
}

/**
 * Send error response with consistent format
 * @param {Object} res - Express response object
 * @param {number} status - HTTP status code
 * @param {string} message - Error message
 * @param {string} [code] - Error code
 * @param {Array} [details] - Error details
 */
function sendError(res, status, message, code = null, details = null) {
  const errorResponse = {
    error: message,
    code: code || `HTTP_${status}`,
    timestamp: new Date().toISOString()
  };
  
  if (details && Array.isArray(details) && details.length > 0) {
    errorResponse.details = details;
  }
  
  if (res.req.id) {
    errorResponse.requestId = res.req.id;
  }
  
  logger.warn('Error response sent', {
    status,
    message,
    code,
    endpoint: res.req.originalUrl,
    method: res.req.method
  });
  
  return res.status(status).json(errorResponse);
}

module.exports = {
  sendSuccess,
  sendPaginatedSuccess,
  sendCreated,
  sendNoContent,
  sendAccepted,
  sendDataOrNotFound,
  sendError
};