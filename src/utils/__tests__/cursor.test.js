'use strict';
const { encodeCursor, decodeCursor, isValidCursor } = require('../cursor');

describe('Cursor utilities', () => {
  describe('encodeCursor', () => {
    it('should encode timestamp and id into a cursor token', () => {
      const timestamp = '2023-10-15T10:30:00.000Z';
      const id = '123';
      const cursor = encodeCursor(timestamp, id);
      
      expect(typeof cursor).toBe('string');
      expect(cursor.length).toBeGreaterThan(0);
      // Should not contain URL-unsafe characters
      expect(cursor).not.toMatch(/[+/=]/);
    });

    it('should handle Date objects as timestamps', () => {
      const timestamp = new Date('2023-10-15T10:30:00.000Z');
      const id = 456;
      const cursor = encodeCursor(timestamp, id);
      
      expect(typeof cursor).toBe('string');
      expect(cursor.length).toBeGreaterThan(0);
    });

    it('should handle numeric IDs', () => {
      const timestamp = '2023-10-15T10:30:00.000Z';
      const id = 789;
      const cursor = encodeCursor(timestamp, id);
      
      expect(typeof cursor).toBe('string');
      expect(cursor.length).toBeGreaterThan(0);
    });

    it('should throw error for null timestamp', () => {
      expect(() => encodeCursor(null, '123')).toThrow('Both timestamp and id are required');
    });

    it('should throw error for null id', () => {
      expect(() => encodeCursor('2023-10-15T10:30:00.000Z', null)).toThrow('Both timestamp and id are required');
    });

    it('should throw error for undefined values', () => {
      expect(() => encodeCursor(undefined, '123')).toThrow('Both timestamp and id are required');
      expect(() => encodeCursor('2023-10-15T10:30:00.000Z', undefined)).toThrow('Both timestamp and id are required');
    });
  });

  describe('decodeCursor', () => {
    it('should decode a valid cursor token', () => {
      const timestamp = '2023-10-15T10:30:00.000Z';
      const id = '123';
      const cursor = encodeCursor(timestamp, id);
      
      const decoded = decodeCursor(cursor);
      expect(decoded.timestamp).toBe(timestamp);
      expect(decoded.id).toBe(id);
    });

    it('should decode cursor with numeric id', () => {
      const timestamp = '2023-10-15T10:30:00.000Z';
      const id = 456;
      const cursor = encodeCursor(timestamp, id);
      
      const decoded = decodeCursor(cursor);
      expect(decoded.timestamp).toBe(timestamp);
      expect(decoded.id).toBe('456'); // Should be stringified
    });

    it('should decode cursor with Date timestamp', () => {
      const timestamp = new Date('2023-10-15T10:30:00.000Z');
      const id = '789';
      const cursor = encodeCursor(timestamp, id);
      
      const decoded = decodeCursor(cursor);
      expect(decoded.timestamp).toBe('2023-10-15T10:30:00.000Z');
      expect(decoded.id).toBe(id);
    });

    it('should throw error for invalid cursor format', () => {
      expect(() => decodeCursor('invalid-cursor')).toThrow('Invalid cursor: malformed or corrupted token');
    });

    it('should throw error for empty cursor', () => {
      expect(() => decodeCursor('')).toThrow('Invalid cursor: cursor must be a non-empty string');
    });

    it('should throw error for null cursor', () => {
      expect(() => decodeCursor(null)).toThrow('Invalid cursor: cursor must be a non-empty string');
    });

    it('should throw error for non-string cursor', () => {
      expect(() => decodeCursor(123)).toThrow('Invalid cursor: cursor must be a non-empty string');
    });

    it('should throw error for cursor missing timestamp', () => {
      const invalidData = { id: '123' };
      const invalidCursor = Buffer.from(JSON.stringify(invalidData)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      
      expect(() => decodeCursor(invalidCursor)).toThrow('Invalid cursor: missing timestamp or id');
    });

    it('should throw error for cursor missing id', () => {
      const invalidData = { timestamp: '2023-10-15T10:30:00.000Z' };
      const invalidCursor = Buffer.from(JSON.stringify(invalidData)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      
      expect(() => decodeCursor(invalidCursor)).toThrow('Invalid cursor: missing timestamp or id');
    });
  });

  describe('isValidCursor', () => {
    it('should return true for valid cursor', () => {
      const cursor = encodeCursor('2023-10-15T10:30:00.000Z', '123');
      expect(isValidCursor(cursor)).toBe(true);
    });

    it('should return false for invalid cursor', () => {
      expect(isValidCursor('invalid-cursor')).toBe(false);
      expect(isValidCursor('')).toBe(false);
      expect(isValidCursor(null)).toBe(false);
      expect(isValidCursor(undefined)).toBe(false);
    });
  });

  describe('Round-trip encoding/decoding', () => {
    it('should maintain data integrity through encode/decode cycle', () => {
      const testCases = [
        { timestamp: '2023-10-15T10:30:00.000Z', id: '123' },
        { timestamp: '2023-12-31T23:59:59.999Z', id: '999' },
        { timestamp: new Date('2023-01-01T00:00:00.000Z'), id: 1 },
        { timestamp: '2023-06-15T12:00:00.000Z', id: 'abc-123' },
      ];

      testCases.forEach(({ timestamp, id }) => {
        const cursor = encodeCursor(timestamp, id);
        const decoded = decodeCursor(cursor);
        
        const expectedTimestamp = timestamp instanceof Date ? timestamp.toISOString() : timestamp;
        const expectedId = String(id);
        
        expect(decoded.timestamp).toBe(expectedTimestamp);
        expect(decoded.id).toBe(expectedId);
      });
    });
  });
});