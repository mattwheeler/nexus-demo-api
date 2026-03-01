'use strict';
const { logger } = require('./logger');
const { handleRateLimitError } = require('./errorHandlers');

/**
 * Simple in-memory rate limiter
 * In production, this should use Redis or another distributed store
 */
class RateLimiter {
  constructor() {
    this.requests = new Map();
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Cleanup every minute
  }
  
  /**
   * Check if request is within rate limit
   * @param {string} key - Rate limit key (usually IP or user ID)
   * @param {number} limit - Maximum requests allowed
   * @param {number} windowMs - Time window in milliseconds
   * @returns {Object} Rate limit status
   */
  checkLimit(key, limit = 100, windowMs = 60000) {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    
    const userRequests = this.requests.get(key);
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(timestamp => timestamp > windowStart);
    this.requests.set(key, validRequests);
    
    const remaining = Math.max(0, limit - validRequests.length);
    const resetTime = Math.ceil((windowStart + windowMs) / 1000);
    
    return {
      allowed: validRequests.length < limit,
      limit,
      remaining,
      resetTime,
      retryAfter: remaining === 0 ? Math.ceil(windowMs / 1000) : null
    };
  }
  
  /**
   * Record a request
   * @param {string} key - Rate limit key
   */
  recordRequest(key) {
    const now = Date.now();
    
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    
    this.requests.get(key).push(now);
  }
  
  /**
   * Clean up old entries
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 300000; // 5 minutes
    
    for (const [key, timestamps] of this.requests.entries()) {
      const validTimestamps = timestamps.filter(timestamp => now - timestamp < maxAge);
      
      if (validTimestamps.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validTimestamps);
      }
    }
  }
  
  /**
   * Destroy rate limiter and cleanup intervals
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Singleton instance
const rateLimiter = new RateLimiter();

/**
 * Rate limiting middleware factory
 * @param {Object} options - Rate limit options
 * @param {number} [options.limit=100] - Maximum requests per window
 * @param {number} [options.windowMs=60000] - Time window in milliseconds
 * @param {Function} [options.keyGenerator] - Function to generate rate limit key
 * @param {boolean} [options.skipSuccessfulRequests=false] - Don't count successful requests
 * @param {boolean} [options.skipFailedRequests=false] - Don't count failed requests
 * @returns {Function} Express middleware
 */
function createRateLimit(options = {}) {
  const {
    limit = 100,
    windowMs = 60000,
    keyGenerator = (req) => req.ip,
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;
  
  return (req, res, next) => {
    const key = keyGenerator(req);
    const limitCheck = rateLimiter.checkLimit(key, limit, windowMs);
    
    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': limitCheck.remaining.toString(),
      'X-RateLimit-Reset': limitCheck.resetTime.toString()
    });
    
    if (!limitCheck.allowed) {
      if (limitCheck.retryAfter) {
        res.set('Retry-After', limitCheck.retryAfter.toString());
      }
      
      return handleRateLimitError(res, limitCheck);
    }
    
    // Record request if not skipping
    if (!skipSuccessfulRequests && !skipFailedRequests) {
      rateLimiter.recordRequest(key);
    } else {
      // Hook into response to record based on status
      const originalSend = res.send;
      res.send = function(data) {
        const isSuccess = res.statusCode >= 200 && res.statusCode < 300;
        const isError = res.statusCode >= 400;
        
        if ((!skipSuccessfulRequests || !isSuccess) && (!skipFailedRequests || !isError)) {
          rateLimiter.recordRequest(key);
        }
        
        return originalSend.call(this, data);
      };
    }
    
    next();
  };
}

/**
 * Rate limit specifically for user activity endpoints
 * @param {Object} req - Express request object
 * @returns {string} Rate limit key
 */
function userActivityKeyGenerator(req) {
  const userId = req.params.id || req.params.userId;
  return userId ? `user:${userId}:${req.ip}` : req.ip;
}

/**
 * Pre-configured rate limiters
 */
const rateLimiters = {
  // General API rate limit
  general: createRateLimit({
    limit: 100,
    windowMs: 60000 // 1 minute
  }),
  
  // User activity specific rate limit
  userActivity: createRateLimit({
    limit: 50,
    windowMs: 60000, // 1 minute
    keyGenerator: userActivityKeyGenerator
  }),
  
  // Stricter rate limit for sensitive operations
  strict: createRateLimit({
    limit: 20,
    windowMs: 60000, // 1 minute
    skipSuccessfulRequests: false,
    skipFailedRequests: true
  })
};

module.exports = {
  RateLimiter,
  rateLimiter,
  createRateLimit,
  rateLimiters,
  userActivityKeyGenerator
};