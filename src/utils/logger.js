'use strict';

/**
 * Simple logger utility for consistent logging across the application
 */
class Logger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
  }
  
  /**
   * Format log message with timestamp and context
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} [context] - Additional context
   * @returns {string} Formatted log message
   */
  formatMessage(level, message, context = {}) {
    const timestamp = new Date().toISOString();
    const contextStr = Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
  }
  
  /**
   * Log info message
   * @param {string} message - Log message
   * @param {Object} [context] - Additional context
   */
  info(message, context = {}) {
    console.log(this.formatMessage('info', message, context));
  }
  
  /**
   * Log warning message
   * @param {string} message - Log message
   * @param {Object} [context] - Additional context
   */
  warn(message, context = {}) {
    console.warn(this.formatMessage('warn', message, context));
  }
  
  /**
   * Log error message
   * @param {string} message - Log message
   * @param {Object} [context] - Additional context
   */
  error(message, context = {}) {
    console.error(this.formatMessage('error', message, context));
  }
  
  /**
   * Log debug message (only in development)
   * @param {string} message - Log message
   * @param {Object} [context] - Additional context
   */
  debug(message, context = {}) {
    if (this.isDevelopment) {
      console.log(this.formatMessage('debug', message, context));
    }
  }
}

// Export singleton instance
const logger = new Logger();

module.exports = { logger };