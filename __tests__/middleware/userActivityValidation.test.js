'use strict';
const { validateUserId, validatePaginationQuery, validateUserActivityRequest } = require('../../src/middleware/userActivityValidation');

describe('userActivityValidation middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: {},
      query: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  describe('validateUserId', () => {
    test('should validate positive integer ID', () => {
      req.params.id = '123';
      
      validateUserId(req, res, next);
      
      expect(req.params.id).toBe(123);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should reject negative numbers', () => {
      req.params.id = '-1';
      
      validateUserId(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid user ID',
        message: 'User ID must be a positive integer'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject non-numeric strings', () => {
      req.params.id = 'abc';
      
      validateUserId(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid user ID',
        message: 'User ID must be a positive integer'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject zero', () => {
      req.params.id = '0';
      
      validateUserId(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validatePaginationQuery', () => {
    test('should use default limit when not provided', () => {
      validatePaginationQuery(req, res, next);
      
      expect(req.query.limit).toBe(10);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should validate and transform limit', () => {
      req.query.limit = '25';
      
      validatePaginationQuery(req, res, next);
      
      expect(req.query.limit).toBe(25);
      expect(next).toHaveBeenCalled();
    });

    test('should reject limit above 100', () => {
      req.query.limit = '101';
      
      validatePaginationQuery(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid query parameters',
        message: 'Limit must be a number between 1 and 100',
        field: 'limit'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject limit below 1', () => {
      req.query.limit = '0';
      
      validatePaginationQuery(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    test('should validate valid base64 cursor', () => {
      // Valid base64 that decodes to a timestamp-like string
      const validCursor = Buffer.from('2023-01-01T00:00:00.000Z', 'utf-8').toString('base64');
      req.query.cursor = validCursor;
      
      validatePaginationQuery(req, res, next);
      
      expect(req.query.cursor).toBe(validCursor);
      expect(next).toHaveBeenCalled();
    });

    test('should validate cursor with numeric ID', () => {
      const validCursor = Buffer.from('123', 'utf-8').toString('base64');
      req.query.cursor = validCursor;
      
      validatePaginationQuery(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    test('should reject invalid base64 cursor', () => {
      req.query.cursor = 'invalid-base64!';
      
      validatePaginationQuery(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid query parameters',
        message: 'Cursor must be a valid base64 encoded pagination token',
        field: 'cursor'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateUserActivityRequest', () => {
    test('should validate both user ID and pagination', () => {
      req.params.id = '123';
      req.query.limit = '20';
      
      validateUserActivityRequest(req, res, next);
      
      expect(req.params.id).toBe(123);
      expect(req.query.limit).toBe(20);
      expect(next).toHaveBeenCalled();
    });

    test('should fail if user ID is invalid', () => {
      req.params.id = 'invalid';
      req.query.limit = '20';
      
      validateUserActivityRequest(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });
});