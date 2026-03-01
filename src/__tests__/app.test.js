'use strict';
const request = require('supertest');
const app = require('../app');
const { activityService } = require('../services/activityService');

describe('App', () => {
  beforeEach(async () => {
    // Clear activities before each test
    await activityService.clearAllActivities();
  });

  describe('GET /users/:id', () => {
    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/users/999')
        .expect(404);
      
      expect(response.body).toEqual({ error: 'User not found' });
    });
  });

  describe('POST /users', () => {
    it('should create a user successfully', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com'
      };

      const response = await request(app)
        .post('/users')
        .send(userData)
        .expect(201);

      expect(response.body.user).toMatchObject({
        name: userData.name,
        email: userData.email
      });
      expect(response.body.user.id).toBeDefined();
    });

    it('should return 400 when name is missing', async () => {
      const response = await request(app)
        .post('/users')
        .send({ email: 'john@example.com' })
        .expect(400);
      
      expect(response.body).toEqual({ error: 'name and email are required' });
    });

    it('should return 400 when email is missing', async () => {
      const response = await request(app)
        .post('/users')
        .send({ name: 'John Doe' })
        .expect(400);
      
      expect(response.body).toEqual({ error: 'name and email are required' });
    });
  });

  describe('GET /users/:id/activities', () => {
    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/users/999/activities')
        .expect(404);
      
      expect(response.body).toEqual({ error: 'User not found' });
    });

    it('should return activities for existing user', async () => {
      // First create a user
      const userResponse = await request(app)
        .post('/users')
        .send({ name: 'John Doe', email: 'john@example.com' });
      
      const userId = userResponse.body.user.id;

      // Get activities
      const response = await request(app)
        .get(`/users/${userId}/activities`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toHaveProperty('hasMore');
    });

    it('should validate query parameters', async () => {
      // First create a user
      const userResponse = await request(app)
        .post('/users')
        .send({ name: 'John Doe', email: 'john@example.com' });
      
      const userId = userResponse.body.user.id;

      // Test with invalid limit
      const response = await request(app)
        .get(`/users/${userId}/activities?limit=999`)
        .expect(422);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body).toHaveProperty('issues');
    });
  });

  describe('404 handler', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/non-existent-route')
        .expect(404);
      
      expect(response.body).toEqual({ error: 'Not found' });
    });
  });
});