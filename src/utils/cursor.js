'use strict';

/**
 * Encodes cursor data into a base64 string
 * @param {Object} data - The cursor data to encode
 * @param {string} data.created_at - The created_at timestamp
 * @param {number} data.id - The record id
 * @returns {string} Base64 encoded cursor
 */
function encodeCursor(data) {
  const cursorData = {
    created_at: data.created_at,
    id: data.id
  };
  return Buffer.from(JSON.stringify(cursorData)).toString('base64');
}

/**
 * Decodes a base64 cursor string back to cursor data
 * @param {string} cursor - The base64 encoded cursor
 * @returns {Object|null} Decoded cursor data or null if invalid
 * @returns {string} returns.created_at - The created_at timestamp
 * @returns {number} returns.id - The record id
 */
function decodeCursor(cursor) {
  try {
    if (!cursor || typeof cursor !== 'string') {
      return null;
    }
    const decoded = Buffer.from(cursor, 'base64').toString('utf8');
    const data = JSON.parse(decoded);
    
    if (!data.created_at || !data.id) {
      return null;
    }
    
    return {
      created_at: data.created_at,
      id: Number(data.id)
    };
  } catch (err) {
    return null;
  }
}

module.exports = { encodeCursor, decodeCursor };