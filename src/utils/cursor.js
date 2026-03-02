'use strict';

/**
 * Encodes a cursor token from timestamp and ID for pagination
 * @param {string|Date} timestamp - The timestamp value
 * @param {string|number} id - The ID value
 * @returns {string} URL-safe base64 encoded cursor token
 */
function encodeCursor(timestamp, id) {
  if (timestamp == null || id == null) {
    throw new Error('Both timestamp and id are required for cursor encoding');
  }

  // Convert timestamp to ISO string if it's a Date object
  const timestampStr = timestamp instanceof Date ? timestamp.toISOString() : String(timestamp);
  const idStr = String(id);

  // Create cursor object
  const cursorData = {
    timestamp: timestampStr,
    id: idStr
  };

  // Encode as JSON then base64
  const jsonStr = JSON.stringify(cursorData);
  const base64Str = Buffer.from(jsonStr, 'utf8').toString('base64');
  
  // Make URL-safe by replacing characters
  return base64Str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Decodes a cursor token to extract timestamp and ID
 * @param {string} cursor - The cursor token to decode
 * @returns {{timestamp: string, id: string}} Object containing timestamp and id
 * @throws {Error} When cursor is invalid or malformed
 */
function decodeCursor(cursor) {
  if (!cursor || typeof cursor !== 'string') {
    throw new Error('Invalid cursor: cursor must be a non-empty string');
  }

  try {
    // Restore base64 padding and convert from URL-safe format
    let base64Str = cursor.replace(/-/g, '+').replace(/_/g, '/');
    
    // Add padding if needed
    while (base64Str.length % 4) {
      base64Str += '=';
    }

    // Decode from base64 to JSON string
    const jsonStr = Buffer.from(base64Str, 'base64').toString('utf8');
    
    // Parse JSON
    const cursorData = JSON.parse(jsonStr);

    // Validate structure
    if (!cursorData || typeof cursorData !== 'object') {
      throw new Error('Invalid cursor format');
    }

    if (!cursorData.timestamp || !cursorData.id) {
      throw new Error('Invalid cursor: missing timestamp or id');
    }

    return {
      timestamp: cursorData.timestamp,
      id: cursorData.id
    };
  } catch (error) {
    if (error.message.startsWith('Invalid cursor:')) {
      throw error;
    }
    throw new Error('Invalid cursor: malformed or corrupted token');
  }
}

/**
 * Checks if a cursor token is valid without throwing an error
 * @param {string} cursor - The cursor token to validate
 * @returns {boolean} True if cursor is valid, false otherwise
 */
function isValidCursor(cursor) {
  try {
    decodeCursor(cursor);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  encodeCursor,
  decodeCursor,
  isValidCursor
};