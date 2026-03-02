'use strict';
const request = require('supertest');
const app = require('../src/app');
const { ActivityService, generateCursor } = require('../src/services/ActivityService');
const { createUser } = require('../src/models/User');
const Database = require('better-sqlite3');
const path = require('path');

// Clean database before each test
const db = new Database(path.join(__dirname, '../demo.db'));

describe('GET /users/:id/activity - Integration Tests', () => {
  let testUser;
  let activities = [];

  beforeEach(async () => {
    // Clean up database
    db.exec('DELETE FROM activities');
    db.exec('DELETE FROM users');
    
    // Create test user with unique email
    const timestamp = Date.now();
    testUser = await createUser({
      name: 'Test User',
      email: `test${timestamp}@example.com`
    });
    
    // Create test activities
    const now = new Date();
    activities = [];
    
    for (let i = 0; i < 5; i++) {
      const timestamp = new Date(now.getTime() - i * 60000).toISOString(); // 1 minute apart
      const activity = await ActivityService.createActivity(testUser.id, {
        event_type: `event_${i}`,
        timestamp,
        metadata: { index: i, value: `test_${i}` }
      });
      activities.push(activity);
    }
    
    // Reverse to match expected order (newest first)
    activities.reverse();
  });

  describe('Successful activity retrieval', () => {
    test('should return user activities with default pagination', async () => {
      const response = await request(app)
        .get(`/users/${testUser.id}/activities`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.activities).toHaveLength(5);
      expect(response.body.pagination).toHaveProperty('hasMore', false);
      expect(response.body.pagination).toHaveProperty('limit', 10);
    });

    test('should return activities in chronological order (newest first)', async () => {
      const response = await request(app)
        .get(`/users/${testUser.id}/activities`)
        .expect(200);

      const returnedActivities = response.body.activities;
      
      // Check that activities are in descending order by timestamp
      for (let i = 0; i < returnedActivities.length - 1; i++) {
        const current = new Date(returnedActivities[i].timestamp);
        const next = new Date(returnedActivities[i + 1].timestamp);
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
      }
    });

    test('should include all activity fields', async () => {
      const response = await request(app)
        .get(`/users/${testUser.id}/activities`)
        .expect(200);

      const activity = response.body.activities[0];
      expect(activity).toHaveProperty('id');
      expect(activity).toHaveProperty('user_id', testUser.id);
      expect(activity).toHaveProperty('event_type');
      expect(activity).toHaveProperty('timestamp');
      expect(activity).toHaveProperty('metadata');
      expect(activity).toHaveProperty('cursor');
    });
  });

  describe('Cursor-based pagination', () => {
    test('should handle pagination with limit parameter', async () => {
      const response = await request(app)
        .get(`/users/${testUser.id}/activities?limit=3`)
        .expect(200);

      expect(response.body.activities).toHaveLength(3);
      expect(response.body.pagination.hasMore).toBe(true);
      expect(response.body.pagination.nextCursor).toBeDefined();
    });

    test('should handle cursor-based pagination', async () => {
      // First request with limit
      const firstResponse = await request(app)
        .get(`/users/${testUser.id}/activities?limit=2`)
        .expect(200);

      expect(firstResponse.body.activities).toHaveLength(2);
      expect(firstResponse.body.pagination.hasMore).toBe(true);
      
      const cursor = firstResponse.body.pagination.nextCursor;
      expect(cursor).toBeDefined();

      // Second request with cursor
      const secondResponse = await request(app)
        .get(`/users/${testUser.id}/activities?limit=2&cursor=${cursor}`)
        .expect(200);

      expect(secondResponse.body.activities).toHaveLength(2);
      
      // Ensure no overlap between pages
      const firstIds = firstResponse.body.activities.map(a => a.id);
      const secondIds = secondResponse.body.activities.map(a => a.id);
      const overlap = firstIds.filter(id => secondIds.includes(id));
      expect(overlap).toHaveLength(0);
    });

    test('should handle last page correctly', async () => {
      const response = await request(app)
        .get(`/users/${testUser.id}/activities?limit=10`)
        .expect(200);

      expect(response.body.activities).toHaveLength(5);
      expect(response.body.pagination.hasMore).toBe(false);
      expect(response.body.pagination.nextCursor).toBeNull();
    });
  });

  describe('Input validation', () => {
    test('should validate user ID parameter', async () => {
      const response = await request(app)
        .get('/users/invalid/activities')
        .expect(400);

      expect(response.body.error).toContain('Invalid user ID');
    });

    test('should validate limit parameter', async () => {
      const response = await request(app)
        .get(`/users/${testUser.id}/activities?limit=invalid`)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    test('should validate limit range', async () => {
      const response = await request(app)
        .get(`/users/${testUser.id}/activities?limit=0`)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });
});