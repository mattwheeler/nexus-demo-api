'use strict';

// Mock better-sqlite3 to prevent native binding issues in tests
jest.mock('better-sqlite3', () => {
  return jest.fn().mockImplementation(() => {
    const mockDb = {
      exec: jest.fn(),
      prepare: jest.fn(() => ({
        run: jest.fn(() => ({ lastInsertRowid: 1 })),
        get: jest.fn(() => null),
        all: jest.fn(() => [])
      })),
      close: jest.fn()
    };
    return mockDb;
  });
});