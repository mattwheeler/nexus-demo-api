'use strict';
const request = require('supertest');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const app = require('../src/app');
const { MigrationRunner } = require('../src/db/migrate');

// Test database path
const TEST_DB_PATH = path.join(__dirname, '../test-demo.db');

/**
 * Integration tests for the GET /users/{id}/activity endpoint
 * Tests complete functionality including pagination, validation, and error scenarios
 */
describe('Activity Endpoint Integration Tests', () => {
  let db;
  let testUser;
  let testActivities;

  beforeAll(async () => {
    // Remove test database if it exists
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    // Create test database connection
    db = new Database(TEST_DB_PATH);
    
    // Set the test database path for the application
    process.env.TEST_DB_PATH = TEST_DB_PATH;
    
    // Initialize database schema
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    
    // Run migrations to create activity_events table
    const migrationRunner = new MigrationRunner(TEST_DB_PATH);
    try {
      await migrationRunner.runMigrations();
    } catch (error) {
      console.log('Migration already executed or error:', error.message);
    } finally {
      migrationRunner.close();
    }
  });

  beforeEach(async () => {
    // Clean up existing data
    db.prepare('DELETE FROM activity_events').run();
    db.prepare('DELETE FROM users').run();
    
    // Create test user
    const userResult = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)').run('Test User', 'test@example.com');
    testUser = { id: userResult.lastInsertRowid, name: 'Test User', email: 'test@example.com' };
    
    // Create test activity events with different timestamps
    testActivities = [];
    const baseTime = new Date('2024-01-01T12:00:00.000Z');
    
    for (let i = 0; i < 25; i++) {
      const timestamp = new Date(baseTime.getTime() + (i * 60 * 60 * 1000)).toISOString(); // 1 hour apart
      const eventType = i % 3 === 0 ? 'login' : i % 3 === 1 ? 'logout' : 'action';
      const metadata = JSON.stringify({ index: i, type: eventType });
      
      const result = db.prepare(`
        INSERT INTO activity_events (user_id, event_type, timestamp, metadata) 
        VALUES (?, ?, ?, ?)
      `).run(testUser.id, eventType, timestamp, metadata);
      
      testActivities.push({
        id: result.lastInsertRowid,
        userId: testUser.id,
        eventType,
        timestamp,
        metadata: { index: i, type: eventType }
      });
    }
    
    // Sort activities by timestamp descending (most recent first)
    testActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  });

  afterAll(async () => {
    if (db) {
      db.close();
    }
    
    // Clean up test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  describe('GET /users/:id/activity - Successful Retrieval', () => {
    /**
     * Test successful retrieval of activity events without pagination
     */
    it('should retrieve activity events for existing user', async () => {
      const response = await request(app)
        .get(`/users/${testUser.id}/activity`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('events');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data).toHaveProperty('metadata');

      const { events, pagination, metadata } = response.body.data;

      // Should return default limit of 20 events
      expect(events).toHaveLength(20);
      expect(pagination.limit).toBe(20);
      expect(pagination.hasMore).toBe(true);
      expect(pagination.nextCursor).toBeTruthy();
      expect(metadata.totalReturned).toBe(20);

      // Events should be sorted by timestamp descending
      for (let i = 1; i < events.length; i++) {
        expect(new Date(events[i - 1].timestamp).getTime())
          .toBeGreaterThanOrEqual(new Date(events[i].timestamp).getTime());
      }

      // Verify event structure
      events.forEach(event => {
        expect(event).toHaveProperty('id');
        expect(event).toHaveProperty('userId', testUser.id);
        expect(event).toHaveProperty('eventType');
        expect(event).toHaveProperty('timestamp');
        expect(event).toHaveProperty('metadata');
        expect(event).toHaveProperty('createdAt');
        expect(event).toHaveProperty('updatedAt');
      });
    });

    /**
     * Test retrieval with custom limit
     */
    it('should respect custom limit parameter', async () => {
      const response = await request(app)
        .get(`/users/${testUser.id}/activity?limit=5`)
        .expect(200);

      const { events, pagination } = response.body.data;
      expect(events).toHaveLength(5);
      expect(pagination.limit).toBe(5);
      expect(pagination.hasMore).toBe(true);
    });

    /**
     * Test retrieval with event type filter
     */
    it('should filter by event type', async () => {
      const response = await request(app)
        .get(`/users/${testUser.id}/activity?eventType=login`)
        .expect(200);

      const { events, metadata } = response.body.data;
      
      // All events should be login events
      events.forEach(event => {
        expect(event.eventType).toBe('login');
      });

      expect(metadata.filters).toEqual({ eventType: 'login' });
      
      // Should have approximately 8-9 login events (every 3rd event)
      expect(events.length).toBeGreaterThanOrEqual(8);
      expect(events.length).toBeLessThanOrEqual(9);
    });

    /**
     * Test retrieval for user with no activities
     */
    it('should return empty results for user with no activities', async () => {
      // Create another user with no activities
      const userResult = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)').run('Empty User', 'empty@example.com');
      const emptyUser = { id: userResult.lastInsertRowid };

      const response = await request(app)
        .get(`/users/${emptyUser.id}/activity`)
        .expect(200);

      const { events, pagination, metadata } = response.body.data;
      expect(events).toHaveLength(0);
      expect(pagination.hasMore).toBe(false);
      expect(pagination.nextCursor).toBeNull();
      expect(metadata.totalReturned).toBe(0);
    });
  });

  describe('GET /users/:id/activity - Cursor-based Pagination', () => {
    /**
     * Test basic cursor-based pagination
     */
    it('should implement cursor-based pagination correctly', async () => {
      // First page
      const firstResponse = await request(app)
        .get(`/users/${testUser.id}/activity?limit=10`)
        .expect(200);

      const firstPage = firstResponse.body.data;
      expect(firstPage.events).toHaveLength(10);
      expect(firstPage.pagination.hasMore).toBe(true);
      expect(firstPage.pagination.nextCursor).toBeTruthy();

      // Second page using cursor
      const cursor = firstPage.pagination.nextCursor;
      const secondResponse = await request(app)
        .get(`/users/${testUser.id}/activity?limit=10&cursor=${encodeURIComponent(cursor)}`)
        .expect(200);

      const secondPage = secondResponse.body.data;
      expect(secondPage.events).toHaveLength(10);
      expect(secondPage.pagination.hasMore).toBe(true);
      expect(secondPage.pagination.cursor).toBe(cursor);

      // Verify no overlap between pages
      const firstPageIds = firstPage.events.map(e => e.id);
      const secondPageIds = secondPage.events.map(e => e.id);
      const overlap = firstPageIds.filter(id => secondPageIds.includes(id));
      expect(overlap).toHaveLength(0);

      // Verify timestamp ordering across pages
      const lastFirstPageTimestamp = firstPage.events[firstPage.events.length - 1].timestamp;
      const firstSecondPageTimestamp = secondPage.events[0].timestamp;
      expect(new Date(lastFirstPageTimestamp).getTime())
        .toBeGreaterThan(new Date(firstSecondPageTimestamp).getTime());
    });

    /**
     * Test pagination to the end of results
     */
    it('should handle pagination to end of results', async () => {
      // Get last page with remaining 5 events
      const response = await request(app)
        .get(`/users/${testUser.id}/activity?limit=10&cursor=${testActivities[19].timestamp}`)
        .expect(200);

      const { events, pagination } = response.body.data;
      expect(events).toHaveLength(5); // Last 5 events
      expect(pagination.hasMore).toBe(false);
      expect(pagination.nextCursor).toBeNull();
    });

    /**
     * Test pagination with event type filter
     */
    it('should paginate filtered results correctly', async () => {
      // First page of login events
      const firstResponse = await request(app)
        .get(`/users/${testUser.id}/activity?eventType=login&limit=3`)
        .expect(200);

      const firstPage = firstResponse.body.data;
      expect(firstPage.events).toHaveLength(3);
      expect(firstPage.events.every(e => e.eventType === 'login')).toBe(true);
      expect(firstPage.pagination.hasMore).toBe(true);

      // Second page of login events
      const cursor = firstPage.pagination.nextCursor;
      const secondResponse = await request(app)
        .get(`/users/${testUser.id}/activity?eventType=login&limit=3&cursor=${encodeURIComponent(cursor)}`)
        .expect(200);

      const secondPage = secondResponse.body.data;
      expect(secondPage.events.length).toBeGreaterThan(0);
      expect(secondPage.events.every(e => e.eventType === 'login')).toBe(true);
    });
  });

  describe('GET /users/:id/activity - Input Validation', () => {
    /**
     * Test invalid user ID formats
     */
    it('should reject invalid user ID formats', async () => {
      const invalidIds = ['abc', '0', '-1', '1.5', 'null', ''];
      
      for (const invalidId of invalidIds) {
        const response = await request(app)
          .get(`/users/${invalidId}/activity`)
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('type', 'VALIDATION_ERROR');
        expect(response.body).toHaveProperty('details');
        expect(response.body.details[0].path).toBe('userId');
      }
    });

    /**
     * Test invalid limit parameter
     */
    it('should reject invalid limit values', async () => {
      const invalidLimits = ['0', '-1', '101', 'abc', '1.5'];
      
      for (const invalidLimit of invalidLimits) {
        const response = await request(app)
          .get(`/users/${testUser.id}/activity?limit=${invalidLimit}`)
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Invalid query parameters');
        expect(response.body).toHaveProperty('type', 'VALIDATION_ERROR');
      }
    });

    /**
     * Test invalid cursor format
     */
    it('should reject invalid cursor format', async () => {
      const invalidCursors = ['invalid-date', '2024-13-01', 'not-a-date', '123456789'];
      
      for (const invalidCursor of invalidCursors) {
        const response = await request(app)
          .get(`/users/${testUser.id}/activity?cursor=${invalidCursor}`)
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Invalid query parameters');
        expect(response.body).toHaveProperty('type', 'VALIDATION_ERROR');
      }
    });

    /**
     * Test limit boundary values
     */
    it('should accept valid limit boundary values', async () => {
      // Minimum valid limit
      const minResponse = await request(app)
        .get(`/users/${testUser.id}/activity?limit=1`)
        .expect(200);
      expect(minResponse.body.data.events).toHaveLength(1);

      // Maximum valid limit
      const maxResponse = await request(app)
        .get(`/users/${testUser.id}/activity?limit=100`)
        .expect(200);
      expect(maxResponse.body.data.events.length).toBeLessThanOrEqual(25); // We only have 25 test events
    });

    /**
     * Test valid cursor format
     */
    it('should accept valid ISO datetime cursor', async () => {
      const validCursor = '2024-01-01T15:00:00.000Z';
      
      const response = await request(app)
        .get(`/users/${testUser.id}/activity?cursor=${encodeURIComponent(validCursor)}`)
        .expect(200);

      expect(response.body.data.pagination.cursor).toBe(validCursor);
    });
  });

  describe('GET /users/:id/activity - Error Handling', () => {
    /**
     * Test non-existent user
     */
    it('should return 404 for non-existent user', async () => {
      const nonExistentUserId = 99999;
      
      const response = await request(app)
        .get(`/users/${nonExistentUserId}/activity`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'User not found');
      expect(response.body).toHaveProperty('type', 'NOT_FOUND_ERROR');
      expect(response.body).toHaveProperty('details');
      expect(response.body.details[0].path).toBe('user');
      expect(response.body.details[0].message).toContain(nonExistentUserId.toString());
    });

    /**
     * Test missing user ID parameter
     */
    it('should return 404 for missing user ID in path', async () => {
      const response = await request(app)
        .get('/users//activity')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not found');
      expect(response.body).toHaveProperty('type', 'NOT_FOUND_ERROR');
    });

    /**
     * Test malformed request path
     */
    it('should handle malformed paths gracefully', async () => {
      const malformedPaths = [
        '/users/activity', // Missing user ID
        '/users/1/activities', // Wrong endpoint name (should be activity)
      ];
      
      for (const path of malformedPaths) {
        const response = await request(app)
          .get(path)
          .expect(404);

        expect(response.body).toHaveProperty('error', 'Not found');
      }
    });

    /**
     * Test handling of database errors (simulated)
     */
    it('should handle database connection issues gracefully', async () => {
      // Close the database to simulate connection issue
      db.close();
      
      const response = await request(app)
        .get(`/users/${testUser.id}/activity`)
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('type', 'DATABASE_ERROR');
      
      // Recreate database connection for other tests
      db = new Database(TEST_DB_PATH);
    });
  });

  describe('GET /users/:id/activity - Edge Cases', () => {
    /**
     * Test very large user ID
     */
    it('should handle very large user IDs', async () => {
      const largeUserId = 2147483647; // Max 32-bit integer
      
      const response = await request(app)
        .get(`/users/${largeUserId}/activity`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'User not found');
    });

    /**
     * Test cursor pointing to non-existent timestamp
     */
    it('should handle cursor with non-existent timestamp', async () => {
      // Use a timestamp that's before all our test data
      const earlyTimestamp = '2023-01-01T00:00:00.000Z';
      
      const response = await request(app)
        .get(`/users/${testUser.id}/activity?cursor=${encodeURIComponent(earlyTimestamp)}`)
        .expect(200);

      // Should return empty results since cursor is before all events
      expect(response.body.data.events).toHaveLength(0);
      expect(response.body.data.pagination.hasMore).toBe(false);
    });

    /**
     * Test cursor pointing to future timestamp
     */
    it('should handle cursor with future timestamp', async () => {
      // Use a timestamp that's after all our test data
      const futureTimestamp = '2025-01-01T00:00:00.000Z';
      
      const response = await request(app)
        .get(`/users/${testUser.id}/activity?cursor=${encodeURIComponent(futureTimestamp)}`)
        .expect(200);

      // Should return all events since cursor is after all events
      expect(response.body.data.events.length).toBeGreaterThan(0);
    });

    /**
     * Test empty event type filter
     */
    it('should handle empty event type parameter', async () => {
      const response = await request(app)
        .get(`/users/${testUser.id}/activity?eventType=`)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid query parameters');
      expect(response.body).toHaveProperty('type', 'VALIDATION_ERROR');
    });

    /**
     * Test non-existent event type filter
     */
    it('should handle non-existent event type filter', async () => {
      const response = await request(app)
        .get(`/users/${testUser.id}/activity?eventType=nonexistent`)
        .expect(200);

      // Should return empty results
      expect(response.body.data.events).toHaveLength(0);
      expect(response.body.data.metadata.filters).toEqual({ eventType: 'nonexistent' });
    });

    /**
     * Test multiple query parameters
     */
    it('should handle multiple valid query parameters', async () => {
      const response = await request(app)
        .get(`/users/${testUser.id}/activity?limit=5&eventType=login&cursor=${encodeURIComponent(testActivities[0].timestamp)}`)
        .expect(200);

      const { events, pagination, metadata } = response.body.data;
      expect(events.length).toBeLessThanOrEqual(5);
      expect(events.every(e => e.eventType === 'login')).toBe(true);
      expect(pagination.limit).toBe(5);
      expect(metadata.filters).toEqual({ eventType: 'login' });
    });
  });

  describe('GET /users/:id/activity - Response Format', () => {
    /**
     * Test response structure consistency
     */
    it('should return consistent response structure', async () => {
      const response = await request(app)
        .get(`/users/${testUser.id}/activity`)
        .expect(200);

      // Top-level structure
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

      // Data structure
      const { data } = response.body;
      expect(data).toHaveProperty('events');
      expect(data).toHaveProperty('pagination');
      expect(data).toHaveProperty('metadata');

      // Pagination structure
      expect(data.pagination).toHaveProperty('hasMore');
      expect(data.pagination).toHaveProperty('nextCursor');
      expect(data.pagination).toHaveProperty('limit');
      expect(data.pagination).toHaveProperty('cursor');

      // Metadata structure
      expect(data.metadata).toHaveProperty('totalReturned');
      expect(data.metadata).toHaveProperty('requestedAt');
      expect(data.metadata).toHaveProperty('filters');
    });

    /**
     * Test event object structure
     */
    it('should return properly formatted event objects', async () => {
      const response = await request(app)
        .get(`/users/${testUser.id}/activity?limit=1`)
        .expect(200);

      const event = response.body.data.events[0];
      
      // Required properties
      expect(event).toHaveProperty('id');
      expect(event).toHaveProperty('userId');
      expect(event).toHaveProperty('eventType');
      expect(event).toHaveProperty('timestamp');
      expect(event).toHaveProperty('createdAt');
      expect(event).toHaveProperty('updatedAt');
      
      // Property types
      expect(typeof event.id).toBe('number');
      expect(typeof event.userId).toBe('number');
      expect(typeof event.eventType).toBe('string');
      expect(typeof event.timestamp).toBe('string');
      expect(typeof event.createdAt).toBe('string');
      expect(typeof event.updatedAt).toBe('string');
      
      // Timestamp formats
      expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(event.createdAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
      expect(event.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });
  });

  describe('GET /users/:id/activity - Performance', () => {
    /**
     * Test response time for typical requests
     */
    it('should respond within reasonable time limits', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get(`/users/${testUser.id}/activity`)
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    /**
     * Test handling of maximum limit
     */
    it('should handle maximum limit efficiently', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get(`/users/${testUser.id}/activity?limit=100`)
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000); // Should still respond within 1 second
    });
  });
});
