'use strict';

const request = require('supertest');
const app = require('../src/app');
const Database = require('better-sqlite3');
const path = require('path');

// Test database setup
let db;

beforeAll(() => {
  // Use in-memory database for tests
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
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  
  // Mock the database connection in the User model
  const User = require('../src/models/User');
  const originalDb = User.db || db;
  User.db = db;
});

beforeEach(() => {
  // Clear tables before each test
  db.exec('DELETE FROM activity_events');
  db.exec('DELETE FROM users');
  db.exec('DELETE FROM sqlite_sequence WHERE name IN ("users", "activity_events")');
});

afterfAll(() => {
  if (db) {
    db.close();
  }
});

/**
 * Helper function to create a test user
 * @param {Object} userData - User data
 * @returns {Object} Created user
 */
function createTestUser(userData = {}) {
  const defaultUser = {
    name: 'John Doe',
    email: 'john@example.com'
  };
  const user = { ...defaultUser, ...userData };
  
  const result = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)').run(user.name, user.email);
  return db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
}

/**
 * Helper function to create test activities
 * @param {number} userId - User ID
 * @param {Array} activities - Array of activity data
 * @returns {Array} Created activities
 */
function createTestActivities(userId, activities = []) {
  const createdActivities = [];
  
  activities.forEach((activity, index) => {
    const activityData = {
      type: 'test_action',
      description: `Test activity ${index + 1}`,
      ...activity
    };
    
    const result = db.prepare(
      'INSERT INTO activity_events (user_id, type, description) VALUES (?, ?, ?)'
    ).run(userId, activityData.type, activityData.description);
    
    createdActivities.push(
      db.prepare('SELECT * FROM activity_events WHERE id = ?').get(result.lastInsertRowid)
    );
  });
  
  return createdActivities;
}

describe('GET /users/:user_id/activity', () => {
  describe('Success Cases', () => {
    test('should return activities for valid user ID', async () => {
      const user = createTestUser();
      const activities = createTestActivities(user.id, [
        { type: 'login', description: 'User logged in' },
        { type: 'profile_update', description: 'Updated profile' },
        { type: 'logout', description: 'User logged out' }
      ]);
      
      const response = await request(app)
        .get(`/users/${user.id}/activity`)
        .expect(200);
      
      expect(response.body).toHaveProperty('activities');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.activities).toHaveLength(3);
      expect(response.body.activities[0]).toHaveProperty('id');
      expect(response.body.activities[0]).toHaveProperty('type');
      expect(response.body.activities[0]).toHaveProperty('description');
      expect(response.body.activities[0]).toHaveProperty('created_at');
      
      // Verify pagination metadata
      expect(response.body.pagination).toEqual({
        limit: 10,
        offset: 0,
        total: 3,
        hasMore: false
      });
    });
    
    test('should return empty activities for user with no activity', async () => {
      const user = createTestUser();
      
      const response = await request(app)
        .get(`/users/${user.id}/activity`)
        .expect(200);
      
      expect(response.body.activities).toEqual([]);
      expect(response.body.pagination).toEqual({
        limit: 10,
        offset: 0,
        total: 0,
        hasMore: false
      });
    });
    
    test('should return activities ordered by created_at DESC', async () => {
      const user = createTestUser();
      
      // Create activities with specific timestamps
      db.prepare(`
        INSERT INTO activity_events (user_id, type, description, created_at) 
        VALUES (?, ?, ?, ?)
      `).run(user.id, 'first', 'First activity', '2024-01-01 10:00:00');
      
      db.prepare(`
        INSERT INTO activity_events (user_id, type, description, created_at) 
        VALUES (?, ?, ?, ?)
      `).run(user.id, 'second', 'Second activity', '2024-01-02 10:00:00');
      
      db.prepare(`
        INSERT INTO activity_events (user_id, type, description, created_at) 
        VALUES (?, ?, ?, ?)
      `).run(user.id, 'third', 'Third activity', '2024-01-03 10:00:00');
      
      const response = await request(app)
        .get(`/users/${user.id}/activity`)
        .expect(200);
      
      expect(response.body.activities).toHaveLength(3);
      expect(response.body.activities[0].type).toBe('third');
      expect(response.body.activities[1].type).toBe('second');
      expect(response.body.activities[2].type).toBe('first');
    });
  });
  
  describe('Pagination', () => {
    let user;
    
    beforeEach(() => {
      user = createTestUser();
      // Create 25 activities for pagination testing
      const activities = Array.from({ length: 25 }, (_, i) => ({
        type: `activity_${i + 1}`,
        description: `Test activity ${i + 1}`
      }));
      createTestActivities(user.id, activities);
    });
    
    test('should respect default pagination (limit=10, offset=0)', async () => {
      const response = await request(app)
        .get(`/users/${user.id}/activity`)
        .expect(200);
      
      expect(response.body.activities).toHaveLength(10);
      expect(response.body.pagination).toEqual({
        limit: 10,
        offset: 0,
        total: 25,
        hasMore: true
      });
    });
    
    test('should handle custom limit parameter', async () => {
      const response = await request(app)
        .get(`/users/${user.id}/activity?limit=5`)
        .expect(200);
      
      expect(response.body.activities).toHaveLength(5);
      expect(response.body.pagination).toEqual({
        limit: 5,
        offset: 0,
        total: 25,
        hasMore: true
      });
    });
    
    test('should handle custom offset parameter', async () => {
      const response = await request(app)
        .get(`/users/${user.id}/activity?offset=10`)
        .expect(200);
      
      expect(response.body.activities).toHaveLength(10);
      expect(response.body.pagination).toEqual({
        limit: 10,
        offset: 10,
        total: 25,
        hasMore: true
      });
    });
    
    test('should handle limit and offset together', async () => {
      const response = await request(app)
        .get(`/users/${user.id}/activity?limit=5&offset=20`)
        .expect(200);
      
      expect(response.body.activities).toHaveLength(5);
      expect(response.body.pagination).toEqual({
        limit: 5,
        offset: 20,
        total: 25,
        hasMore: false
      });
    });
    
    test('should handle offset beyond available records', async () => {
      const response = await request(app)
        .get(`/users/${user.id}/activity?offset=30`)
        .expect(200);
      
      expect(response.body.activities).toHaveLength(0);
      expect(response.body.pagination).toEqual({
        limit: 10,
        offset: 30,
        total: 25,
        hasMore: false
      });
    });
    
    test('should handle maximum limit (50)', async () => {
      const response = await request(app)
        .get(`/users/${user.id}/activity?limit=50`)
        .expect(200);
      
      expect(response.body.activities).toHaveLength(25);
      expect(response.body.pagination).toEqual({
        limit: 50,
        offset: 0,
        total: 25,
        hasMore: false
      });
    });
  });
  
  describe('Error Cases', () => {
    test('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/users/99999/activity')
        .expect(404);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('User not found');
    });
    
    test('should return 400 for invalid user ID (non-integer)', async () => {
      const response = await request(app)
        .get('/users/invalid/activity')
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Invalid input parameters');
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'user_id',
            message: 'user_id must be a positive integer'
          })
        ])
      );
    });
    
    test('should return 400 for negative user ID', async () => {
      const response = await request(app)
        .get('/users/-1/activity')
        .expect(400);
      
      expect(response.body.error).toBe('Invalid input parameters');
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'user_id',
            message: 'user_id must be a positive integer'
          })
        ])
      );
    });
    
    test('should return 400 for zero user ID', async () => {
      const response = await request(app)
        .get('/users/0/activity')
        .expect(400);
      
      expect(response.body.error).toBe('Invalid input parameters');
    });
    
    test('should return 400 for invalid limit parameter', async () => {
      const user = createTestUser();
      
      const response = await request(app)
        .get(`/users/${user.id}/activity?limit=invalid`)
        .expect(400);
      
      expect(response.body.error).toBe('Invalid input parameters');
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'limit',
            message: 'limit must be an integer'
          })
        ])
      );
    });
    
    test('should return 400 for limit below minimum (1)', async () => {
      const user = createTestUser();
      
      const response = await request(app)
        .get(`/users/${user.id}/activity?limit=0`)
        .expect(400);
      
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'limit',
            message: 'limit must be between 1 and 50'
          })
        ])
      );
    });
    
    test('should return 400 for limit above maximum (50)', async () => {
      const user = createTestUser();
      
      const response = await request(app)
        .get(`/users/${user.id}/activity?limit=51`)
        .expect(400);
      
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'limit',
            message: 'limit must be between 1 and 50'
          })
        ])
      );
    });
    
    test('should return 400 for invalid offset parameter', async () => {
      const user = createTestUser();
      
      const response = await request(app)
        .get(`/users/${user.id}/activity?offset=invalid`)
        .expect(400);
      
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'offset',
            message: 'offset must be an integer'
          })
        ])
      );
    });
    
    test('should return 400 for negative offset', async () => {
      const user = createTestUser();
      
      const response = await request(app)
        .get(`/users/${user.id}/activity?offset=-1`)
        .expect(400);
      
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'offset',
            message: 'offset must be a non-negative integer'
          })
        ])
      );
    });
    
    test('should return 400 for multiple validation errors', async () => {
      const response = await request(app)
        .get('/users/invalid/activity?limit=invalid&offset=invalid')
        .expect(400);
      
      expect(response.body.error).toBe('Invalid input parameters');
      expect(response.body.details).toHaveLength(3); // user_id, limit, offset
    });
  });
  
  describe('Edge Cases', () => {
    test('should handle decimal user ID by converting to integer', async () => {
      const response = await request(app)
        .get('/users/1.5/activity')
        .expect(400);
      
      // Decimal should be treated as invalid
      expect(response.body.error).toBe('Invalid input parameters');
    });
    
    test('should handle very large user ID', async () => {
      const response = await request(app)
        .get('/users/999999999999/activity')
        .expect(404);
      
      expect(response.body.error).toBe('User not found');
    });
    
    test('should handle limit and offset as strings that convert to valid numbers', async () => {
      const user = createTestUser();
      createTestActivities(user.id, [{ type: 'test', description: 'Test' }]);
      
      const response = await request(app)
        .get(`/users/${user.id}/activity?limit=5&offset=0`)
        .expect(200);
      
      expect(response.body.pagination.limit).toBe(5);
      expect(response.body.pagination.offset).toBe(0);
    });
  });
  
  describe('Database Error Handling', () => {
    test('should handle database connection errors gracefully', async () => {
      // Mock database error by temporarily replacing the database
      const User = require('../src/models/User');
      const originalDb = User.db;
      
      // Mock a database that throws errors
      const mockDb = {
        prepare: () => {
          throw new Error('Database connection failed');
        }
      };
      
      User.db = mockDb;
      
      const response = await request(app)
        .get('/users/1/activity')
        .expect(500);
      
      expect(response.body).toHaveProperty('error');
      
      // Restore original database
      User.db = originalDb;
    });
  });
  
  describe('Response Format Validation', () => {
    test('should return properly formatted response structure', async () => {
      const user = createTestUser();
      const activities = createTestActivities(user.id, [
        { type: 'test_action', description: 'Test description' }
      ]);
      
      const response = await request(app)
        .get(`/users/${user.id}/activity`)
        .expect(200);
      
      // Validate response structure
      expect(response.body).toMatchObject({
        activities: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            user_id: expect.any(Number),
            type: expect.any(String),
            description: expect.any(String),
            created_at: expect.any(String)
          })
        ]),
        pagination: expect.objectContaining({
          limit: expect.any(Number),
          offset: expect.any(Number),
          total: expect.any(Number),
          hasMore: expect.any(Boolean)
        })
      });
    });
    
    test('should include correct user_id in all activity records', async () => {
      const user = createTestUser();
      createTestActivities(user.id, [
        { type: 'action1', description: 'Description 1' },
        { type: 'action2', description: 'Description 2' }
      ]);
      
      const response = await request(app)
        .get(`/users/${user.id}/activity`)
        .expect(200);
      
      response.body.activities.forEach(activity => {
        expect(activity.user_id).toBe(user.id);
      });
    });
  });
});