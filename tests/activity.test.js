'use strict';
const {
  createActivity,
  getActivity,
  getUserActivities,
  getAllActivities,
  cleanupOldActivities
} = require('../src/models/Activity');
const { createUser } = require('../src/models/User');

describe('Activity Model', () => {
  let testUser;
  
  beforeAll(async () => {
    // Create a test user
    testUser = await createUser({
      name: 'Test User',
      email: 'test@example.com'
    });
  });
  
  describe('createActivity', () => {
    it('should create an activity event with required fields', async () => {
      const activityData = {
        user_id: testUser.id,
        event_type: 'login',
        metadata: { ip_address: '127.0.0.1', user_agent: 'test-agent' }
      };
      
      const activity = await createActivity(activityData);
      
      expect(activity).toBeDefined();
      expect(activity.id).toBeDefined();
      expect(activity.user_id).toBe(testUser.id);
      expect(activity.event_type).toBe('login');
      expect(activity.timestamp).toBeDefined();
      expect(activity.metadata).toEqual(activityData.metadata);
      expect(activity.created_at).toBeDefined();
    });
    
    it('should create activity with custom timestamp', async () => {
      const customTimestamp = '2024-01-01T12:00:00Z';
      const activity = await createActivity({
        user_id: testUser.id,
        event_type: 'page_view',
        timestamp: customTimestamp,
        metadata: { page: '/dashboard' }
      });
      
      expect(activity.timestamp).toBe(customTimestamp);
    });
    
    it('should create activity without metadata', async () => {
      const activity = await createActivity({
        user_id: testUser.id,
        event_type: 'logout'
      });
      
      expect(activity.metadata).toBeNull();
    });
  });
  
  describe('getActivity', () => {
    it('should retrieve an activity by ID', async () => {
      const created = await createActivity({
        user_id: testUser.id,
        event_type: 'test_event'
      });
      
      const retrieved = await getActivity(created.id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(created.id);
      expect(retrieved.user_id).toBe(testUser.id);
      expect(retrieved.event_type).toBe('test_event');
    });
    
    it('should return null for non-existent activity', async () => {
      const activity = await getActivity(999999);
      expect(activity).toBeNull();
    });
  });
  
  describe('getUserActivities', () => {
    beforeAll(async () => {
      // Create multiple activities for testing pagination
      for (let i = 0; i < 15; i++) {
        await createActivity({
          user_id: testUser.id,
          event_type: i % 2 === 0 ? 'even_event' : 'odd_event',
          metadata: { index: i }
        });
      }
    });
    
    it('should get user activities with default pagination', async () => {
      const result = await getUserActivities(testUser.id);
      
      expect(result.events).toBeDefined();
      expect(Array.isArray(result.events)).toBe(true);
      expect(result.events.length).toBeGreaterThan(0);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.total).toBeGreaterThan(0);
      expect(result.pagination.limit).toBe(50);
      expect(result.pagination.offset).toBe(0);
    });
    
    it('should support custom pagination', async () => {
      const result = await getUserActivities(testUser.id, {
        limit: 5,
        offset: 2
      });
      
      expect(result.events.length).toBeLessThanOrEqual(5);
      expect(result.pagination.limit).toBe(5);
      expect(result.pagination.offset).toBe(2);
    });
    
    it('should filter by event type', async () => {
      const result = await getUserActivities(testUser.id, {
        event_type: 'even_event'
      });
      
      result.events.forEach(event => {
        expect(event.event_type).toBe('even_event');
      });
    });
    
    it('should filter by timestamp range', async () => {
      const now = new Date().toISOString();
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const result = await getUserActivities(testUser.id, {
        since: oneHourAgo,
        until: now
      });
      
      result.events.forEach(event => {
        expect(event.timestamp >= oneHourAgo).toBe(true);
        expect(event.timestamp <= now).toBe(true);
      });
    });
  });
  
  describe('getAllActivities', () => {
    it('should get all activities with pagination', async () => {
      const result = await getAllActivities({ limit: 10 });
      
      expect(result.events).toBeDefined();
      expect(Array.isArray(result.events)).toBe(true);
      expect(result.events.length).toBeLessThanOrEqual(10);
      expect(result.pagination).toBeDefined();
    });
    
    it('should filter by user_id', async () => {
      const result = await getAllActivities({ user_id: testUser.id });
      
      result.events.forEach(event => {
        expect(event.user_id).toBe(testUser.id);
      });
    });
  });
  
  describe('cleanupOldActivities', () => {
    it('should return number of deleted activities', async () => {
      // This test assumes no activities older than 90 days exist in test DB
      const deleted = await cleanupOldActivities(90);
      expect(typeof deleted).toBe('number');
      expect(deleted >= 0).toBe(true);
    });
  });
});