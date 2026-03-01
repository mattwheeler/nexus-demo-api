'use strict';
const { ActivityService } = require('../ActivityService');
const { clearAllMockActivities } = require('../../data/mockActivityData');

describe('ActivityService', () => {
  let activityService;
  
  beforeEach(() => {
    activityService = new ActivityService();
    clearAllMockActivities();
  });
  
  afterEach(() => {
    clearAllMockActivities();
  });
  
  describe('getUserActivity', () => {
    const userId = 'user123';
    
    test('should return activities for a user without cursor', async () => {
      const result = await activityService.getUserActivity(userId, { limit: 5 });
      
      expect(result).toHaveProperty('activities');
      expect(result).toHaveProperty('nextCursor');
      expect(result).toHaveProperty('hasMore');
      expect(result.activities).toHaveLength(5);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBeTruthy();
      
      // Check that activities are sorted by timestamp descending
      for (let i = 1; i < result.activities.length; i++) {
        const prevTime = new Date(result.activities[i - 1].timestamp).getTime();
        const currentTime = new Date(result.activities[i].timestamp).getTime();
        expect(prevTime).toBeGreaterThanOrEqual(currentTime);
      }
    });
    
    test('should handle pagination with cursor', async () => {
      const firstPage = await activityService.getUserActivity(userId, { limit: 10 });
      expect(firstPage.activities).toHaveLength(10);
      expect(firstPage.hasMore).toBe(true);
      
      const secondPage = await activityService.getUserActivity(userId, {
        cursor: firstPage.nextCursor,
        limit: 10
      });
      
      expect(secondPage.activities).toHaveLength(10);
      expect(secondPage.hasMore).toBe(true);
      
      // Ensure no overlap between pages
      const firstPageIds = new Set(firstPage.activities.map(a => a.id));
      const secondPageIds = new Set(secondPage.activities.map(a => a.id));
      const intersection = [...firstPageIds].filter(id => secondPageIds.has(id));
      expect(intersection).toHaveLength(0);
      
      // Ensure proper ordering across pages
      const lastFromFirst = firstPage.activities[firstPage.activities.length - 1];
      const firstFromSecond = secondPage.activities[0];
      const lastTime = new Date(lastFromFirst.timestamp).getTime();
      const firstTime = new Date(firstFromSecond.timestamp).getTime();
      expect(lastTime).toBeGreaterThanOrEqual(firstTime);
    });
    
    test('should handle last page correctly', async () => {
      // Get all activities in smaller chunks
      let allActivities = [];
      let cursor = null;
      let hasMore = true;
      
      while (hasMore) {
        const result = await activityService.getUserActivity(userId, {
          cursor,
          limit: 8
        });
        
        allActivities.push(...result.activities);
        cursor = result.nextCursor;
        hasMore = result.hasMore;
        
        if (!hasMore) {
          expect(result.nextCursor).toBeNull();
        }
      }
      
      // Should have exactly 30 activities (from mock data)
      expect(allActivities).toHaveLength(30);
    });
    
    test('should throw error for missing userId', async () => {
      await expect(activityService.getUserActivity(null))
        .rejects.toThrow('userId is required');
    });
    
    test('should throw error for invalid limit', async () => {
      await expect(activityService.getUserActivity(userId, { limit: 0 }))
        .rejects.toThrow('limit must be between 1 and 100');
      
      await expect(activityService.getUserActivity(userId, { limit: 101 }))
        .rejects.toThrow('limit must be between 1 and 100');
    });
    
    test('should throw error for invalid cursor', async () => {
      await expect(activityService.getUserActivity(userId, { cursor: 'invalid-cursor' }))
        .rejects.toThrow('Invalid cursor format');
    });
    
    test('should handle malformed cursor gracefully', async () => {
      const malformedCursor = Buffer.from('{ "invalid": "data" }', 'utf8').toString('base64');
      
      await expect(activityService.getUserActivity(userId, { cursor: malformedCursor }))
        .rejects.toThrow('Invalid cursor format');
    });
    
    test('should handle cursor pointing beyond available data', async () => {
      // Create a cursor with a very old timestamp
      const oldTimestamp = '2020-01-01T00:00:00.000Z';
      const testCursor = Buffer.from(JSON.stringify({
        timestamp: oldTimestamp,
        id: 'test_id'
      }), 'utf8').toString('base64');
      
      const result = await activityService.getUserActivity(userId, {
        cursor: testCursor,
        limit: 10
      });
      
      expect(result.activities).toHaveLength(0);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });
    
    test('should use default limit when not specified', async () => {
      const result = await activityService.getUserActivity(userId);
      expect(result.activities).toHaveLength(20); // default limit
    });
  });
  
  describe('cursor encoding/decoding', () => {
    test('should encode and decode cursor correctly', () => {
      const activityService = new ActivityService();
      const cursorData = {
        timestamp: '2024-01-01T12:00:00.000Z',
        id: 'act_123'
      };
      
      const encoded = activityService._encodeCursor(cursorData);
      expect(typeof encoded).toBe('string');
      
      const decoded = activityService._decodeCursor(encoded);
      expect(decoded).toEqual(cursorData);
    });
  });
});