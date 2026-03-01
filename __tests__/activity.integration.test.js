'use strict';
const request = require('supertest');
const app = require('../src/app');
const Database = require('better-sqlite3');
const path = require('path');

// Use a separate test database
const testDbPath = path.join(__dirname, '../test.db');
const db = new Database(testDbPath);

/**
 * Integration tests for GET /users/{id}/activity endpoint
 * Tests the complete end-to-end functionality including:
 * - Successful activity retrieval
 * - Cursor-based pagination
 * - Input validation
 * - Error scenarios
 * - Edge cases
 */
describe('GET /users/:id/activity - Integration Tests', () => {
  let testUserId;
  let testActivities = [];

  beforeAll(async () => {
    // Initialize test database schema
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS activity_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        type TEXT NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  });

  beforeEach(async () => {
    // Clean up tables
    db.exec('DELETE FROM activity_events');
    db.exec('DELETE FROM users');
    
    // Create test user
    const userResult = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)').run('Test User', 'test@example.com');
    testUserId = userResult.lastInsertRowid;
    
    // Create test activities with different timestamps
    testActivities = [];
    const activityTypes = ['login', 'logout', 'profile_update', 'password_change', 'data_export'];
    
    for (let i = 0; i < 15; i++) {
      const type = activityTypes[i % activityTypes.length];
      const description = `Test ${type} activity ${i + 1}`;
      const createdAt = new Date(Date.now() - (i * 60000)).toISOString(); // Each activity 1 minute apart
      
      const result = db.prepare(
        'INSERT INTO activity_events (user_id, type, description, created_at) VALUES (?, ?, ?, ?)'
      ).run(testUserId, type, description, createdAt);
      
      testActivities.push({
        id: result.lastInsertRowid,
        user_id: testUserId,
        type,
        description,
        created_at: createdAt
      });
    }
    
    // Sort by created_at descending (most recent first) to match expected API behavior
    testActivities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  });

  afterAll(async () => {
    db.close();
  });

  describe('Successful Activity Retrieval', () => {
    test('should return user activities with default parameters', async () => {
      const response = await request(app)
        .get(`/users/${testUserId}/activity`)
        .expect(200);

      expect(response.body).toHaveProperty('activities');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.activities)).toBe(true);
      expect(response.body.activities.length).toBeLessThanOrEqual(10); // Default limit
      
      // Verify activity structure
      const activity = response.body.activities[0];
      expect(activity).toHaveProperty('id');
      expect(activity).toHaveProperty('type');
      expect(activity).toHaveProperty('description');
      expect(activity).toHaveProperty('created_at');
      expect(activity.user_id).toBe(testUserId);
    });

    test('should return activities ordered by created_at descending', async () => {
      const response = await request(app)
        .get(`/users/${testUserId}/activity`)
        .expect(200);

      const activities = response.body.activities;
      expect(activities.length).toBeGreaterThan(1);
      
      // Verify descending order
      for (let i = 1; i < activities.length; i++) {
        const current = new Date(activities[i].created_at);
        const previous = new Date(activities[i - 1].created_at);
        expect(current.getTime()).toBeLessThanOrEqual(previous.getTime());
      }
    });

    test('should respect custom limit parameter', async () => {
      const customLimit = 5;
      const response = await request(app)
        .get(`/users/${testUserId}/activity?limit=${customLimit}`)
        .expect(200);

      expect(response.body.activities.length).toBeLessThanOrEqual(customLimit);
      expect(response.body.pagination.limit).toBe(customLimit);
    });
  });

  describe('Cursor-based Pagination', () => {
    test('should provide next cursor when more activities exist', async () => {
      const response = await request(app)
        .get(`/users/${testUserId}/activity?limit=5`)
        .expect(200);

      expect(response.body.pagination).toHaveProperty('next_cursor');
      expect(response.body.pagination.has_more).toBe(true);
      expect(response.body.activities.length).toBe(5);
    });

    test('should return next page with cursor parameter', async () => {
      // Get first page
      const firstResponse = await request(app)
        .get(`/users/${testUserId}/activity?limit=5`)
        .expect(200);

      const nextCursor = firstResponse.body.pagination.next_cursor;
      expect(nextCursor).toBeDefined();

      // Get second page
      const secondResponse = await request(app)
        .get(`/users/${testUserId}/activity?limit=5&cursor=${nextCursor}`)
        .expect(200);

      expect(secondResponse.body.activities.length).toBeGreaterThan(0);
      expect(secondResponse.body.activities.length).toBeLessThanOrEqual(5);
      
      // Verify no overlap between pages
      const firstPageIds = firstResponse.body.activities.map(a => a.id);
      const secondPageIds = secondResponse.body.activities.map(a => a.id);
      const intersection = firstPageIds.filter(id => secondPageIds.includes(id));
      expect(intersection.length).toBe(0);
    });

    test('should indicate no more results on last page', async () => {
      // Get activities with limit larger than total count
      const response = await request(app)
        .get(`/users/${testUserId}/activity?limit=20`)
        .expect(200);

      expect(response.body.pagination.has_more).toBe(false);
      expect(response.body.pagination.next_cursor).toBeNull();
    });

    test('should handle cursor pagination through all pages', async () => {
      const allActivities = [];
      let cursor = null;
      let hasMore = true;
      const limit = 3;

      while (hasMore) {
        const url = cursor ? 
          `/users/${testUserId}/activity?limit=${limit}&cursor=${cursor}` :
          `/users/${testUserId}/activity?limit=${limit}`;
        
        const response = await request(app)
          .get(url)
          .expect(200);

        allActivities.push(...response.body.activities);
        cursor = response.body.pagination.next_cursor;
        hasMore = response.body.pagination.has_more;
      }

      // Should have retrieved all activities
      expect(allActivities.length).toBe(testActivities.length);
      
      // Verify no duplicates
      const ids = allActivities.map(a => a.id);
      const uniqueIds = [...new Set(ids)];
      expect(uniqueIds.length).toBe(ids.length);
    });
  });

  describe('Input Validation', () => {
    test('should reject invalid user ID format', async () => {
      const response = await request(app)
        .get('/users/invalid/activity')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid user ID');
    });

    test('should reject negative limit', async () => {
      const response = await request(app)
        .get(`/users/${testUserId}/activity?limit=-5`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('limit');
    });

    test('should reject limit exceeding maximum', async () => {
      const response = await request(app)
        .get(`/users/${testUserId}/activity?limit=101`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('limit');
    });

    test('should reject zero limit', async () => {
      const response = await request(app)
        .get(`/users/${testUserId}/activity?limit=0`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('limit');
    });

    test('should reject non-numeric limit', async () => {
      const response = await request(app)
        .get(`/users/${testUserId}/activity?limit=abc`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('limit');
    });
  });

  describe('Error Scenarios', () => {
    test('should return 404 for non-existent user', async () => {
      const nonExistentUserId = 99999;
      const response = await request(app)
        .get(`/users/${nonExistentUserId}/activity`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('User not found');
    });

    test('should handle invalid cursor gracefully', async () => {
      const response = await request(app)
        .get(`/users/${testUserId}/activity?cursor=invalid_cursor_123`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid cursor');
    });

    test('should handle malformed cursor', async () => {
      const response = await request(app)
        .get(`/users/${testUserId}/activity?cursor=malformed!!cursor`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('cursor');
    });

    test('should handle expired or out-of-range cursor', async () => {
      // Create a cursor that represents a timestamp far in the future
      const futureCursor = Buffer.from(JSON.stringify({ 
        created_at: '2099-12-31T23:59:59.999Z',
        id: 999999 
      })).toString('base64');

      const response = await request(app)
        .get(`/users/${testUserId}/activity?cursor=${futureCursor}`)
        .expect(200);

      // Should return empty results gracefully
      expect(response.body.activities).toHaveLength(0);
      expect(response.body.pagination.has_more).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    test('should handle user with no activity', async () => {
      // Create user with no activities
      const userResult = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)').run('Empty User', 'empty@example.com');
      const emptyUserId = userResult.lastInsertRowid;

      const response = await request(app)
        .get(`/users/${emptyUserId}/activity`)
        .expect(200);

      expect(response.body.activities).toHaveLength(0);
      expect(response.body.pagination.has_more).toBe(false);
      expect(response.body.pagination.next_cursor).toBeNull();
    });

    test('should handle single activity', async () => {
      // Create user with single activity
      const userResult = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)').run('Single Activity User', 'single@example.com');
      const singleUserId = userResult.lastInsertRowid;
      
      db.prepare('INSERT INTO activity_events (user_id, type, description) VALUES (?, ?, ?)')
        .run(singleUserId, 'login', 'Single login event');

      const response = await request(app)
        .get(`/users/${singleUserId}/activity`)
        .expect(200);

      expect(response.body.activities).toHaveLength(1);
      expect(response.body.pagination.has_more).toBe(false);
      expect(response.body.pagination.next_cursor).toBeNull();
      expect(response.body.activities[0].type).toBe('login');
    });

    test('should handle exactly one page of results', async () => {
      // Create user with exactly 10 activities (default limit)
      const userResult = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)').run('Exact Page User', 'exact@example.com');
      const exactUserId = userResult.lastInsertRowid;
      
      for (let i = 0; i < 10; i++) {
        db.prepare('INSERT INTO activity_events (user_id, type, description) VALUES (?, ?, ?)')
          .run(exactUserId, 'test_action', `Activity ${i + 1}`);
      }

      const response = await request(app)
        .get(`/users/${exactUserId}/activity`)
        .expect(200);

      expect(response.body.activities).toHaveLength(10);
      expect(response.body.pagination.has_more).toBe(false);
      expect(response.body.pagination.next_cursor).toBeNull();
    });

    test('should handle concurrent activities with same timestamp', async () => {
      // Create activities with identical timestamps
      const userResult = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)').run('Concurrent User', 'concurrent@example.com');
      const concurrentUserId = userResult.lastInsertRowid;
      
      const sameTimestamp = new Date().toISOString();
      for (let i = 0; i < 5; i++) {
        db.prepare('INSERT INTO activity_events (user_id, type, description, created_at) VALUES (?, ?, ?, ?)')
          .run(concurrentUserId, 'concurrent_action', `Concurrent activity ${i + 1}`, sameTimestamp);
      }

      const response = await request(app)
        .get(`/users/${concurrentUserId}/activity`)
        .expect(200);

      expect(response.body.activities).toHaveLength(5);
      // All activities should have the same timestamp but different IDs
      response.body.activities.forEach(activity => {
        expect(activity.created_at).toBe(sameTimestamp);
      });
      
      // IDs should be unique even with same timestamp
      const ids = response.body.activities.map(a => a.id);
      const uniqueIds = [...new Set(ids)];
      expect(uniqueIds.length).toBe(5);
    });

    test('should handle large limit within bounds', async () => {
      const response = await request(app)
        .get(`/users/${testUserId}/activity?limit=100`)
        .expect(200);

      expect(response.body.activities.length).toBe(testActivities.length);
      expect(response.body.pagination.has_more).toBe(false);
    });
  });

  describe('Response Structure Validation', () => {
    test('should return consistent response structure', async () => {
      const response = await request(app)
        .get(`/users/${testUserId}/activity`)
        .expect(200);

      // Validate top-level structure
      expect(response.body).toHaveProperty('activities');
      expect(response.body).toHaveProperty('pagination');
      
      // Validate pagination structure
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('has_more');
      expect(response.body.pagination).toHaveProperty('next_cursor');
      
      // Validate activity structure if activities exist
      if (response.body.activities.length > 0) {
        const activity = response.body.activities[0];
        expect(activity).toHaveProperty('id');
        expect(activity).toHaveProperty('type');
        expect(activity).toHaveProperty('description');
        expect(activity).toHaveProperty('created_at');
        
        // Validate data types
        expect(typeof activity.id).toBe('number');
        expect(typeof activity.type).toBe('string');
        expect(typeof activity.description).toBe('string');
        expect(typeof activity.created_at).toBe('string');
        
        // Validate timestamp format
        expect(new Date(activity.created_at).toISOString()).toBe(activity.created_at);
      }
    });

    test('should maintain consistent pagination metadata', async () => {
      const response = await request(app)
        .get(`/users/${testUserId}/activity?limit=7`)
        .expect(200);

      expect(typeof response.body.pagination.limit).toBe('number');
      expect(typeof response.body.pagination.has_more).toBe('boolean');
      expect(response.body.pagination.next_cursor === null || typeof response.body.pagination.next_cursor === 'string').toBe(true);
    });
  });
});