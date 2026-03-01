'use strict';
const crypto = require('crypto');

/**
 * Utility functions for encoding and decoding pagination cursors
 * with HMAC signing for security
 */

// Get HMAC secret from environment or use default for development
const HMAC_SECRET = process.env.CURSOR_HMAC_SECRET || 'dev-secret-change-in-production';
const HMAC_ALGORITHM = 'sha256';

/**
 * Custom error class for cursor-related errors
 */
class CursorError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CursorError';
  }
}

/**
 * Creates an HMAC signature for the given data
 * @param {string} data - The data to sign
 * @returns {string} The HMAC signature
 */
function createHmac(data) {
  return crypto.createHmac(HMAC_ALGORITHM, HMAC_SECRET)
    .update(data)
    .digest('hex');
}

/**
 * Verifies an HMAC signature
 * @param {string} data - The original data
 * @param {string} signature - The signature to verify
 * @returns {boolean} True if signature is valid
 */
function verifyHmac(data, signature) {
  const expectedSignature = createHmac(data);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

/**
 * Encodes a cursor containing (created_at, id) pair with HMAC signing
 * @param {string|Date} createdAt - The created_at timestamp
 * @param {number|string} id - The record ID
 * @returns {string} Base64 encoded cursor with HMAC signature
 */
function encodeCursor(createdAt, id) {
  if (createdAt == null || id == null) {
    throw new CursorError('Both createdAt and id are required for cursor encoding');
  }

  // Normalize createdAt to ISO string
  const timestamp = createdAt instanceof Date ? createdAt.toISOString() : createdAt;
  
  // Create the cursor payload
  const payload = JSON.stringify({ created_at: timestamp, id: String(id) });
  
  // Create HMAC signature
  const signature = createHmac(payload);
  
  // Combine payload and signature
  const cursorData = JSON.stringify({ payload, signature });
  
  // Base64 encode the entire cursor
  return Buffer.from(cursorData, 'utf8').toString('base64');
}

/**
 * Decodes a cursor and verifies its HMAC signature
 * @param {string} cursor - The base64 encoded cursor
 * @returns {{created_at: string, id: string}} The decoded cursor data
 * @throws {CursorError} If cursor is invalid or tampered with
 */
function decodeCursor(cursor) {
  if (!cursor || typeof cursor !== 'string') {
    throw new CursorError('Invalid cursor format');
  }

  try {
    // Decode base64
    const cursorData = Buffer.from(cursor, 'base64').toString('utf8');
    
    // Parse cursor structure
    const { payload, signature } = JSON.parse(cursorData);
    
    if (!payload || !signature) {
      throw new CursorError('Malformed cursor structure');
    }
    
    // Verify HMAC signature
    if (!verifyHmac(payload, signature)) {
      throw new CursorError('Invalid cursor signature');
    }
    
    // Parse and return the payload
    const data = JSON.parse(payload);
    
    if (!data.created_at || !data.id) {
      throw new CursorError('Malformed cursor payload');
    }
    
    return {
      created_at: data.created_at,
      id: data.id
    };
  } catch (error) {
    if (error instanceof CursorError) {
      throw error;
    }
    throw new CursorError('Invalid cursor format');
  }
}

module.exports = {
  encodeCursor,
  decodeCursor,
  CursorError
};