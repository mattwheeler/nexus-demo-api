'use strict';
const { encodeCursor, decodeCursor, CursorError } = require('../../src/utils/cursor');

describe('cursor utilities', () => {
  describe('encodeCursor', () => {
    test('should encode cursor with timestamp and id', () => {
      const createdAt = '2023-01-01T00:00:00.000Z';
      const id = 123;
      
      const cursor = encodeCursor(createdAt, id);
      
      expect(cursor).toBeDefined();
      expect(typeof cursor).toBe('string');
      // Should be valid base64
      expect(() => Buffer.from(cursor, 'base64')).not.toThrow();
    });

    test('should encode cursor with Date object', () => {
      const createdAt = new Date('2023-01-01T00:00:00.000Z');
      const id = 123;
      
      const cursor = encodeCursor(createdAt, id);
      
      expect(cursor).toBeDefined();
    });

    test('should throw error for null createdAt', () => {
      expect(() => {
        encodeCursor(null, 123);
      }).toThrow(CursorError);
    });

    test('should throw error for null id', () => {
      expect(() => {
        encodeCursor('2023-01-01T00:00:00.000Z', null);
      }).toThrow(CursorError);
    });
  });

  describe('decodeCursor', () => {
    test('should decode valid cursor', () => {
      const createdAt = '2023-01-01T00:00:00.000Z';
      const id = 123;
      const cursor = encodeCursor(createdAt, id);
      
      const decoded = decodeCursor(cursor);
      
      expect(decoded.created_at).toBe(createdAt);
      expect(decoded.id).toBe('123');
    });

    test('should throw error for invalid base64', () => {
      expect(() => {
        decodeCursor('invalid-base64!');
      }).toThrow(CursorError);
    });

    test('should throw error for empty cursor', () => {
      expect(() => {
        decodeCursor('');
      }).toThrow(CursorError);
    });

    test('should throw error for null cursor', () => {
      expect(() => {
        decodeCursor(null);
      }).toThrow(CursorError);
    });

    test('should throw error for tampered cursor', () => {
      // Create a valid cursor first
      const validCursor = encodeCursor('2023-01-01T00:00:00.000Z', 123);
      
      // Tamper with it by changing a character
      const tamperedCursor = validCursor.slice(0, -1) + 'X';
      
      expect(() => {
        decodeCursor(tamperedCursor);
      }).toThrow(CursorError);
    });
  });

  describe('round trip encoding/decoding', () => {
    test('should maintain data integrity', () => {
      const testCases = [
        { createdAt: '2023-01-01T00:00:00.000Z', id: 1 },
        { createdAt: '2023-12-31T23:59:59.999Z', id: 999999 },
        { createdAt: new Date().toISOString(), id: 42 }
      ];
      
      testCases.forEach(({ createdAt, id }) => {
        const cursor = encodeCursor(createdAt, id);
        const decoded = decodeCursor(cursor);
        
        const expectedTimestamp = createdAt instanceof Date ? createdAt.toISOString() : createdAt;
        expect(decoded.created_at).toBe(expectedTimestamp);
        expect(decoded.id).toBe(String(id));
      });
    });
  });
});