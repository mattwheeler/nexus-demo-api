'use strict';

const request = require('supertest');
const app = require('../src/app');
const Database = require('better-sqlite3');
const path = require('path');

// Setup test database
let db;

beforeAll(() => {
  // Use a separate test database
  db = new Database(':memory:');
  
  // Create tables
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    
    CREATE TABLE activity_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      description TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  
  // Insert test data
  db.exec(`
    INSERT INTO users (id, name, email) VALUES 
      (1, 'John Doe', 'john@example.com'),
      (2, 'Jane Smith', 'jane@example.com');
    
    INSERT INTO activity_events (user_id, type, description, metadata) VALUES 
      (1, 'login', 'User logged in', '{"ip": "192.168.1.1"}'),
      (1, 'view_profile', 'Viewed profile page', null),
      (1, 'update_email', 'Updated email address', '{"old_email": "old@example.com"}'),
      (2, 'login', 'User logged in', '{"ip": "10.0.0.1"}');
  `);
});

afterAll(() => {
  if (db) {
    db.close();
  }
});

describe('GET /users/:user_id/activity', () => {
  describe('Parameter Validation', () => {
    test('should return 400 for invalid user_id (non-numeric)', async () => {
      const response = await request(app)
        .get('/users/abc/activity')
        .expect(400);
      
      expect(response.body).toMatchObject({
        error: 'Invalid input parameters',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'user_id',
            message: 'user_id must be a positive integer'
          })
        ])
      });
    });
    
    test('should return 400 for invalid user_id (zero)', async () => {
      const response = await request(app)
        .get('/users/0/activity')
        .expect(400);
      
      expect(response.body).toMatchObject({
        error: 'Invalid input parameters',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'user_id',
            message: 'user_id must be a positive integer'
          })
        ])
      });
    });
    
    test('should return 400 for invalid user_id (negative)', async () => {
      const response = await request(app)
        .get('/users/-1/activity')
        .expect(400);
      
      expect(response.body).toMatchObject({
        error: 'Invalid input parameters',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'user_id',
            message: 'user_id must be a positive integer'
          })
        ])
      });
    });
    
    test('should return 400 for invalid limit (too high)', async () => {
      const response = await request(app)
        .get('/users/1/activity?limit=51')
        .expect(400);
      
      expect(response.body).toMatchObject({
        error: 'Invalid input parameters',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'limit',
            message: 'limit must be between 1 and 50'
          })
        ])
      });
    });
    
    test('should return 400 for invalid limit (zero)', async () => {
      const response = await request(app)
        .get('/users/1/activity?limit=0')
        .expect(400);
      
      expect(response.body).toMatchObject({
        error: 'Invalid input parameters',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'limit',
            message: 'limit must be between 1 and 50'
          })
        ])
      });
    });
    
    test('should return 400 for invalid offset (negative)', async () => {
      const response = await request(app)
        .get('/users/1/activity?offset=-1')
        .expect(400);
      
      expect(response.body).toMatchObject({
        error: 'Invalid input parameters',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'offset',
            message: 'offset must be a non-negative integer'
          })
        ])
      });
    });
  });
  
  describe('User Existence Validation', () => {
    test('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/users/999/activity')
        .expect(404);
      
      expect(response.body).toMatchObject({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
        details: {
          userId: 999
        }
      });
    });
  });
  
  describe('Successful Requests', () => {
    test('should return user activities with default pagination', async () => {
      const response = await request(app)
        .get('/users/1/activity')
        .expect(200);
      
      expect(response.body).toMatchObject({
        activities: expect.any(Array),
        pagination: {
          limit: 10,
          offset: 0,
          total: expect.any(Number),
          hasMore: expect.any(Boolean)
        }
      });
      
      expect(response.body.activities.length).toBeGreaterThan(0);
      expect(response.body.activities[0]).toMatchObject({
        id: expect.any(Number),
        user_id: 1,
        type: expect.any(String),
        description: expect.any(String),
        created_at: expect.any(String)
      });
    });
    
    test('should return user activities with custom limit', async () => {
      const response = await request(app)
        .get('/users/1/activity?limit=2')
        .expect(200);
      
      expect(response.body).toMatchObject({
        activities: expect.any(Array),
        pagination: {
          limit: 2,
          offset: 0,
          total: expect.any(Number),
          hasMore: expect.any(Boolean)
        }
      });
      
      expect(response.body.activities.length).toBeLessThanOrEqual(2);
    });
    
    test('should return user activities with offset', async () => {
      const response = await request(app)
        .get('/users/1/activity?offset=1')
        .expect(200);
      
      expect(response.body).toMatchObject({
        activities: expect.any(Array),
        pagination: {
          limit: 10,
          offset: 1,
          total: expect.any(Number),
          hasMore: expect.any(Boolean)
        }
      });
    });
    
    test('should handle user with no activities', async () => {
      // Create a user with no activities first
      db.exec(`INSERT INTO users (id, name, email) VALUES (99, 'Empty User', 'empty@example.com')`);
      
      const response = await request(app)
        .get('/users/99/activity')
        .expect(200);
      
      expect(response.body).toMatchObject({
        activities: [],
        pagination: {
          limit: 10,
          offset: 0,
          total: 0,
          hasMore: false
        }
      });
    });
    
    test('should properly parse JSON metadata', async () => {
      const response = await request(app)
        .get('/users/1/activity')
        .expect(200);
      
      const activityWithMetadata = response.body.activities.find(a => a.metadata !== null);
      expect(activityWithMetadata).toBeDefined();
      expect(typeof activityWithMetadata.metadata).toBe('object');
      expect(activityWithMetadata.metadata).toHaveProperty('ip');
    });
  });
});