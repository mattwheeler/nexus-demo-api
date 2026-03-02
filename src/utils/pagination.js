'use strict';

/**
 * Encodes cursor from timestamp and ID
 * @param {string} timestamp - ISO timestamp
 * @param {number} id - Record ID
 * @returns {string} Base64 encoded cursor
 */
function encodeCursor(timestamp, id) {
  const cursorData = JSON.stringify({ timestamp, id });
  return Buffer.from(cursorData).toString('base64');
}

/**
 * Decodes cursor to timestamp and ID
 * @param {string} cursor - Base64 encoded cursor
 * @returns {{timestamp: string, id: number}} Decoded cursor data
 */
function decodeCursor(cursor) {
  try {
    const cursorData = Buffer.from(cursor, 'base64').toString('utf8');
    const parsed = JSON.parse(cursorData);
    if (!parsed.timestamp || !parsed.id) {
      throw new Error('Invalid cursor format');
    }
    return parsed;
  } catch (error) {
    throw new Error('Invalid cursor');
  }
}

module.exports = { encodeCursor, decodeCursor };