'use strict';
const request = require('supertest');
const app = require('../../src/app');
const { getUser, createUser } = require('../../src/models/User');

// Mock the User model
jest.mock('../../src/models/User');

describe('Users Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /users/:id', () => {
    test('should return user when found', async () => {
      const mockUser = { id: 1, name: 'John Doe', email: 'john@example.com' };
      getUser.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/users/1')
        .expect(200);

      expect(response.body).toEqual({ user: mockUser });
      expect(getUser).toHaveBeenCalledWith('1');
    });

    test('should return 404 when user not found', async () => {
      getUser.mockResolvedValue(null);

      const response = await request(app)
        .get('/users/999')
        .expect(404);

      expect(response.body).toEqual({ error: 'User not found' });
    });

    test('should handle database errors', async () => {
      getUser.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/users/1')
        .expect(500);

      expect(response.body).toEqual({ error: 'Database error' });
    });
  });

  describe('GET /users/:id/activity', () => {
    test('should return activity with valid user ID and default pagination', async () => {
      const response = await request(app)
        .get('/users/123/activity')
        .expect(200);

      expect(response.body).toEqual({
        user_id: 123,
        activities: [],
        pagination: {
          limit: 10,
          cursor: null,
          has_more: false
        }
      });
    });

    test('should return activity with custom limit', async () => {
      const response = await request(app)
        .get('/users/123/activity?limit=25')
        .expect(200);

      expect(response.body.pagination.limit).toBe(25);
    });

    test('should return activity with cursor', async () => {
      const cursor = Buffer.from('2023-01-01T00:00:00.000Z', 'utf-8').toString('base64');
      const response = await request(app)
        .get(`/users/123/activity?cursor=${cursor}`)
        .expect(200);

      expect(response.body.pagination.cursor).toBe(cursor);
    });

    test('should reject invalid user ID', async () => {
      const response = await request(app)
        .get('/users/invalid/activity')
        .expect(400);

      expect(response.body.error).toBe('Invalid user ID');
    });

    test('should reject invalid limit', async () => {
      const response = await request(app)
        .get('/users/123/activity?limit=101')
        .expect(400);

      expect(response.body.error).toBe('Invalid query parameters');
    });

    test('should reject invalid cursor', async () => {
      const response = await request(app)
        .get('/users/123/activity?cursor=invalid-base64!')
        .expect(400);

      expect(response.body.error).toBe('Invalid query parameters');
    });
  });

  describe('POST /users', () => {
    test('should create user with valid data', async () => {
      const newUser = { name: 'Jane Doe', email: 'jane@example.com' };
      const createdUser = { id: 2, ...newUser, created_at: '2023-01-01T00:00:00.000Z' };
      createUser.mockResolvedValue(createdUser);

      const response = await request(app)
        .post('/users')
        .send(newUser)
        .expect(201);

      expect(response.body).toEqual({ user: createdUser });
      expect(createUser).toHaveBeenCalledWith(newUser);
    });

    test('should reject request without name', async () => {
      const response = await request(app)
        .post('/users')
        .send({ email: 'jane@example.com' })
        .expect(400);

      expect(response.body).toEqual({ error: 'name and email are required' });
    });

    test('should reject request without email', async () => {
      const response = await request(app)
        .post('/users')
        .send({ name: 'Jane Doe' })
        .expect(400);

      expect(response.body).toEqual({ error: 'name and email are required' });
    });

    test('should handle database errors', async () => {
      createUser.mockRejectedValue(new Error('Database constraint error'));

      const response = await request(app)
        .post('/users')
        .send({ name: 'Jane Doe', email: 'jane@example.com' })
        .expect(500);

      expect(response.body).toEqual({ error: 'Database constraint error' });
    });
  });
});

describe('404 handler', () => {
  test('should return 404 for unknown routes', async () => {
    const response = await request(app)
      .get('/nonexistent')
      .expect(404);

    expect(response.body).toEqual({ error: 'Not found' });
  });
});