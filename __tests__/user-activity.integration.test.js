'use strict';
const request = require('supertest');
const app = require('../src/app');
const { createUser } = require('../src/models/User');
const { createActivity, getActivitiesByUserId } = require('../src/models/Activity');
const Database = require('better-sqlite3');
const path = require('path');

// Use a separate test database
const testDbPath = path.join(__dirname, '../test.db');
const fs = require('fs');

describe('GET /users/:id/activity - Integration Tests', () => {
  let testUser;
  let db;

  beforeAll(async () => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    
    db = new Database(testDbPath);
    
    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      
      CREATE TABLE IF NOT EXISTS activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        timestamp TEXT NOT NULL DEFAULT (datetime('now')),
        metadata TEXT,
        cursor TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
      CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON activities(timestamp);
      CREATE INDEX IF NOT EXISTS idx_activities_cursor ON activities(cursor);
      CREATE INDEX IF NOT EXISTS idx_activities_user_timestamp ON activities(user_id, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_activities_user_cursor ON activities(user_id, cursor);
    `);
  });

  beforeEach(async () => {
    // Clean up tables
    db.exec('DELETE FROM activities');
    db.exec('DELETE FROM users');
    
    // Create a test user
    testUser = await createUser({ 
      name: 'Test User', 
      email: 'test@example.com' 
    });
  });

  afterAll(() => {
    if (db) {
      db.close();
    }
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Successful activity retrieval', () => {
    test('should return user activities with default pagination', async () => {
      // Create some test activities
      const activities = [];
      for (let i = 0; i < 5; i++) {
        const activity = await createActivity({
          userId: testUser.id,
          eventType: `event_${i}`,
          metadata: { test: `data_${i}` }
        });
        activities.push(activity);
      }

      const response = await request(app)
        .get(`/users/${testUser.id}/activity`)
        .expect(200);

      expect(response.body).toHaveProperty('activities');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.activities).toHaveLength(5);
      expect(response.body.pagination).toHaveProperty('limit', 10);
      expect(response.body.pagination).toHaveProperty('has_more', false);
      expect(response.body.pagination.next_cursor).toBeNull();
    });

    test('should return activities in chronological order (newest first)', async () => {
      const activities = [];
      
      // Create activities with slight delays to ensure different timestamps
      for (let i = 0; i < 3; i++) {
        const activity = await createActivity({
          userId: testUser.id,
          eventType: `event_${i}`,
          metadata: { order: i }
        });
        activities.push(activity);
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const response = await request(app)
        .get(`/users/${testUser.id}/activity`)
        .expect(200);

      const returnedActivities = response.body.activities;
      expect(returnedActivities).toHaveLength(3);
      
      // Should be ordered by timestamp descending (newest first)
      for (let i = 0; i < returnedActivities.length - 1; i++) {
        const current = new Date(returnedActivities[i].timestamp);
        const next = new Date(returnedActivities[i + 1].timestamp);
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
      }
    });

    test('should include all activity fields', async () => {
      const testMetadata = { action: 'login', ip: '192.168.1.1' };
      await createActivity({
        userId: testUser.id,
        eventType: 'user_login',
        metadata: testMetadata
      });

      const response = await request(app)
        .get(`/users/${testUser.id}/activity`)
        .expect(200);

      const activity = response.body.activities[0];
      expect(activity).toHaveProperty('id');
      expect(activity).toHaveProperty('user_id', testUser.id);
      expect(activity).toHaveProperty('event_type', 'user_login');
      expect(activity).toHaveProperty('timestamp');
      expect(activity).toHaveProperty('metadata');
      expect(activity).toHaveProperty('cursor');
      expect(activity).toHaveProperty('created_at');
      expect(activity.metadata).toEqual(testMetadata);
    });
  });

  describe('Cursor-based pagination', () => {
    test('should handle pagination with limit parameter', async () => {
      // Create more activities than the limit
      for (let i = 0; i < 15; i++) {
        await createActivity({
          userId: testUser.id,
          eventType: `event_${i}`,
          metadata: { index: i }
        });
      }

      const response = await request(app)
        .get(`/users/${testUser.id}/activity?limit=5`)
        .expect(200);

      expect(response.body.activities).toHaveLength(5);
      expect(response.body.pagination.limit).toBe(5);
      expect(response.body.pagination.has_more).toBe(true);
      expect(response.body.pagination.next_cursor).toBeTruthy();
    });

    test('should handle cursor-based pagination', async () => {
      // Create test activities
      for (let i = 0; i < 10; i++) {
        await createActivity({
          userId: testUser.id,
          eventType: `event_${i}`,
          metadata: { index: i }
        });
      }

      // Get first page
      const firstPage = await request(app)
        .get(`/users/${testUser.id}/activity?limit=3`)
        .expect(200);

      expect(firstPage.body.activities).toHaveLength(3);
      expect(firstPage.body.pagination.has_more).toBe(true);
      expect(firstPage.body.pagination.next_cursor).toBeTruthy();

      // Get second page using cursor
      const secondPage = await request(app)
        .get(`/users/${testUser.id}/activity?limit=3&cursor=${firstPage.body.pagination.next_cursor}`)
        .expect(200);

      expect(secondPage.body.activities).toHaveLength(3);
      expect(secondPage.body.pagination.has_more).toBe(true);

      // Ensure no overlap between pages
      const firstPageIds = firstPage.body.activities.map(a => a.id);
      const secondPageIds = secondPage.body.activities.map(a => a.id);
      const overlap = firstPageIds.filter(id => secondPageIds.includes(id));
      expect(overlap).toHaveLength(0);
    });

    test('should handle last page correctly', async () => {
      // Create exactly 7 activities
      for (let i = 0; i < 7; i++) {
        await createActivity({
          userId: testUser.id,
          eventType: `event_${i}`,
          metadata: { index: i }
        });
      }

      // Get first page with limit 5
      const firstPage = await request(app)
        .get(`/users/${testUser.id}/activity?limit=5`)
        .expect(200);

      expect(firstPage.body.pagination.has_more).toBe(true);

      // Get second page (should have only 2 items and no more)
      const secondPage = await request(app)
        .get(`/users/${testUser.id}/activity?limit=5&cursor=${firstPage.body.pagination.next_cursor}`)
        .expect(200);

      expect(secondPage.body.activities).toHaveLength(2);
      expect(secondPage.body.pagination.has_more).toBe(false);
      expect(secondPage.body.pagination.next_cursor).toBeNull();
    });
  });

  describe('Input validation', () => {
    test('should validate user ID parameter', async () => {
      await request(app)
        .get('/users/invalid-id/activity')
        .expect(400);
    });

    test('should validate limit parameter', async () => {
      await request(app)
        .get(`/users/${testUser.id}/activity?limit=invalid`)
        .expect(400);
    });

    test('should validate limit range', async () => {
      // Test negative limit
      await request(app)
        .get(`/users/${testUser.id}/activity?limit=-1`)
        .expect(400);

      // Test zero limit
      await request(app)
        .get(`/users/${testUser.id}/activity?limit=0`)
        .expect(400);

      // Test limit too large
      await request(app)
        .get(`/users/${testUser.id}/activity?limit=101`)
        .expect(400);
    });

    test('should validate cursor format', async () => {
      await request(app)
        .get(`/users/${testUser.id}/activity?cursor=invalid-cursor-format`)
        .expect(400);
    });

    test('should handle malformed query parameters gracefully', async () => {
      const response = await request(app)
        .get(`/users/${testUser.id}/activity?limit=abc&cursor=123`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/validation|invalid/i);
    });
  });

  describe('Error handling', () => {
    test('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/users/99999/activity')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/user.*not.*found/i);
    });

    test('should handle database errors gracefully', async () => {
      // Close the database to simulate an error
      const originalDb = require('../src/models/Activity').__db;
      if (originalDb) {
        originalDb.close();
      }

      const response = await request(app)
        .get(`/users/${testUser.id}/activity`)
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Default limit behavior', () => {
    test('should use default limit of 10 when no limit specified', async () => {
      // Create more than 10 activities
      for (let i = 0; i < 15; i++) {
        await createActivity({
          userId: testUser.id,
          eventType: `event_${i}`,
          metadata: { index: i }
        });
      }

      const response = await request(app)
        .get(`/users/${testUser.id}/activity`)
        .expect(200);

      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.activities).toHaveLength(10);
      expect(response.body.pagination.has_more).toBe(true);
    });

    test('should respect custom limit when provided', async () => {
      for (let i = 0; i < 10; i++) {
        await createActivity({
          userId: testUser.id,
          eventType: `event_${i}`,
          metadata: { index: i }
        });
      }

      const response = await request(app)
        .get(`/users/${testUser.id}/activity?limit=3`)
        .expect(200);

      expect(response.body.pagination.limit).toBe(3);
      expect(response.body.activities).toHaveLength(3);
    });
  });

  describe('Edge cases', () => {
    test('should handle empty activity list', async () => {
      const response = await request(app)
        .get(`/users/${testUser.id}/activity`)
        .expect(200);

      expect(response.body.activities).toEqual([]);
      expect(response.body.pagination).toEqual({
        limit: 10,
        has_more: false,
        next_cursor: null
      });
    });

    test('should handle single activity', async () => {
      await createActivity({
        userId: testUser.id,
        eventType: 'single_event',
        metadata: { test: true }
      });

      const response = await request(app)
        .get(`/users/${testUser.id}/activity`)
        .expect(200);

      expect(response.body.activities).toHaveLength(1);
      expect(response.body.pagination).toEqual({
        limit: 10,
        has_more: false,
        next_cursor: null
      });
    });

    test('should handle exact limit match', async () => {
      // Create exactly 5 activities
      for (let i = 0; i < 5; i++) {
        await createActivity({
          userId: testUser.id,
          eventType: `event_${i}`,
          metadata: { index: i }
        });
      }

      const response = await request(app)
        .get(`/users/${testUser.id}/activity?limit=5`)
        .expect(200);

      expect(response.body.activities).toHaveLength(5);
      expect(response.body.pagination).toEqual({
        limit: 5,
        has_more: false,
        next_cursor: null
      });
    });

    test('should handle user with no activities using cursor', async () => {
      const response = await request(app)
        .get(`/users/${testUser.id}/activity?cursor=some-cursor`)
        .expect(200);

      expect(response.body.activities).toEqual([]);
      expect(response.body.pagination.has_more).toBe(false);
      expect(response.body.pagination.next_cursor).toBeNull();
    });

    test('should handle activities with null metadata', async () => {
      await createActivity({
        userId: testUser.id,
        eventType: 'event_no_metadata',
        metadata: null
      });

      const response = await request(app)
        .get(`/users/${testUser.id}/activity`)
        .expect(200);

      expect(response.body.activities).toHaveLength(1);
      expect(response.body.activities[0].metadata).toBeNull();
    });

    test('should handle very large limit (should cap at maximum)', async () => {
      for (let i = 0; i < 10; i++) {
        await createActivity({
          userId: testUser.id,
          eventType: `event_${i}`,
          metadata: { index: i }
        });
      }

      // Request with valid maximum limit
      const response = await request(app)
        .get(`/users/${testUser.id}/activity?limit=100`)
        .expect(200);

      expect(response.body.activities).toHaveLength(10);
      expect(response.body.pagination.limit).toBe(100);
    });
  });

  describe('Response format validation', () => {
    test('should return consistent response structure', async () => {
      await createActivity({
        userId: testUser.id,
        eventType: 'test_event',
        metadata: { test: true }
      });

      const response = await request(app)
        .get(`/users/${testUser.id}/activity`)
        .expect(200);

      // Validate top-level structure
      expect(response.body).toHaveProperty('activities');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.activities)).toBe(true);

      // Validate pagination structure
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('has_more');
      expect(response.body.pagination).toHaveProperty('next_cursor');

      // Validate activity structure
      if (response.body.activities.length > 0) {
        const activity = response.body.activities[0];
        expect(activity).toHaveProperty('id');
        expect(activity).toHaveProperty('user_id');
        expect(activity).toHaveProperty('event_type');
        expect(activity).toHaveProperty('timestamp');
        expect(activity).toHaveProperty('metadata');
        expect(activity).toHaveProperty('cursor');
        expect(activity).toHaveProperty('created_at');
      }
    });

    test('should return proper content type', async () => {
      const response = await request(app)
        .get(`/users/${testUser.id}/activity`)
        .expect(200)
        .expect('Content-Type', /json/);
    });
  });
});