'use strict';
// Mock better-sqlite3 to avoid native binding issues in tests
jest.mock('better-sqlite3', () => {
  const mockDb = {
    prepare: jest.fn(() => ({
      get: jest.fn(),
      all: jest.fn(),
      run: jest.fn(() => ({ lastInsertRowid: 1 }))
    })),
    exec: jest.fn()
  };
  
  return jest.fn(() => mockDb);
});