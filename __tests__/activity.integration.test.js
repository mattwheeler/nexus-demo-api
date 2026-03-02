'use strict';

const request = require('supertest');
const app = require('../src/app');

// Mock the User model to avoid database issues
jest.mock('../src/models/User', () => ({
  getUser: jest.fn(),
  createUser: jest.fn()
}));

const { getUser } = require('../src/models/User');

describe('Activity Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /users/:id/activity', () => {
    it('should return 404 when route does not exist yet', async () => {
      // Mock user exists
      getUser.mockResolvedValue({ id: 1, name: 'John Doe', email: 'john@example.com' });
      
      const response = await request(app)
        .get('/users/1/activity')
        .expect(404);
        
      expect(response.body).toEqual({
        error: 'Not found',
        type: 'NOT_FOUND_ERROR',
        timestamp: expect.any(String)
      });
    });
  });
});