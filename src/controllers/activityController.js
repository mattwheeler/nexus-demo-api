'use strict';
const { ActivityService } = require('../services/activityService');
const { ActivityErrorResponse, ActivityLogger } = require('../middleware/activityErrorHandler');

/**
 * Activity controller that orchestrates validation, service calls, and response formatting
 * Handles the main GET /users/{id}/activity endpoint
 */
class ActivityController {
  /**
   * Get user activity events with cursor-based pagination
   * @param {Object} req - Express request object with validated data
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getUserActivity(req, res, next) {
    try {
      const { validatedUserId, validatedQuery } = req;
      
      // Call the activity service with validated parameters
      const result = await ActivityService.getUserActivities(validatedUserId, validatedQuery);
      
      // Log successful request
      ActivityLogger.info('User activity retrieved successfully', {
        userId: validatedUserId,
        eventsCount: result.events.length,
        hasMore: result.pagination.hasMore,
        cursor: validatedQuery.cursor || null,
        limit: validatedQuery.limit
      });
      
      // Return successful response with proper structure
      res.status(200).json({
        success: true,
        data: {
          events: result.events,
          pagination: result.pagination,
          metadata: result.metadata
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      // Pass errors to the error handler middleware
      next(error);
    }
  }
  
  /**
   * Get user activity statistics
   * @param {Object} req - Express request object with validated data
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async getUserActivityStats(req, res, next) {
    try {
      const { validatedUserId } = req;
      const { startDate, endDate } = req.query;
      
      // Validate date parameters if provided
      if (startDate && !ActivityController._isValidDate(startDate)) {
        return res.status(400).json(
          ActivityErrorResponse.create(
            'Invalid startDate format',
            [{
              path: 'startDate',
              message: 'startDate must be a valid ISO datetime string'
            }],
            'VALIDATION_ERROR'
          )
        );
      }
      
      if (endDate && !ActivityController._isValidDate(endDate)) {
        return res.status(400).json(
          ActivityErrorResponse.create(
            'Invalid endDate format',
            [{
              path: 'endDate', 
              message: 'endDate must be a valid ISO datetime string'
            }],
            'VALIDATION_ERROR'
          )
        );
      }
      
      // Call the activity service for statistics
      const result = await ActivityService.getUserActivityStats(validatedUserId, {
        startDate,
        endDate
      });
      
      // Log successful request
      ActivityLogger.info('User activity statistics retrieved successfully', {
        userId: validatedUserId,
        totalEvents: result.totalEvents,
        eventTypesCount: result.eventTypes.length,
        dateRange: { startDate, endDate }
      });
      
      // Return successful response
      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      // Pass errors to the error handler middleware
      next(error);
    }
  }
  
  /**
   * Create a new activity event for a user
   * @param {Object} req - Express request object with validated data
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  static async createUserActivity(req, res, next) {
    try {
      const { validatedUserId, validatedEventData } = req;
      
      // Import the model function for creating events
      const { createActivityEvent } = require('../models/ActivityEvent');
      
      // Create the activity event
      const eventData = {
        userId: validatedUserId,
        ...validatedEventData
      };
      
      const createdEvent = await createActivityEvent(eventData);
      
      // Log successful creation
      ActivityLogger.info('User activity event created successfully', {
        userId: validatedUserId,
        eventId: createdEvent.id,
        eventType: createdEvent.eventType
      });
      
      // Return successful response with 201 status
      res.status(201).json({
        success: true,
        data: createdEvent,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      // Pass errors to the error handler middleware
      next(error);
    }
  }
  
  /**
   * Validate if a string is a valid ISO date
   * @private
   * @param {string} dateString - Date string to validate
   * @returns {boolean} True if valid ISO date
   */
  static _isValidDate(dateString) {
    if (typeof dateString !== 'string') return false;
    
    try {
      const date = new Date(dateString);
      return date.toISOString() === dateString;
    } catch {
      return false;
    }
  }
}

module.exports = { ActivityController };