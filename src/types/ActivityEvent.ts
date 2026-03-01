/**
 * Activity Event Type Definitions
 * 
 * This module defines the TypeScript interfaces for activity events in the system.
 * Activity events represent actions taken by actors on subjects or targets within the application.
 */

/**
 * Represents an actor (user or system) that performs an activity
 */
export interface ActivityActor {
  /** Unique identifier for the actor */
  id: string;
  /** Type of actor (user, system, service, etc.) */
  type: 'user' | 'system' | 'service' | 'api';
  /** Display name or identifier for the actor */
  name?: string;
  /** Email address if the actor is a user */
  email?: string;
}

/**
 * Represents the subject of an activity (what the activity is about)
 */
export interface ActivitySubject {
  /** Unique identifier for the subject */
  id: string;
  /** Type of subject (user, document, project, etc.) */
  type: string;
  /** Display name or title of the subject */
  name?: string;
  /** Additional properties specific to the subject type */
  properties?: Record<string, any>;
}

/**
 * Represents the target of an activity (what is being acted upon)
 */
export interface ActivityTarget {
  /** Unique identifier for the target */
  id: string;
  /** Type of target (file, folder, comment, etc.) */
  type: string;
  /** Display name or title of the target */
  name?: string;
  /** Additional properties specific to the target type */
  properties?: Record<string, any>;
}

/**
 * Additional metadata associated with an activity event
 */
export interface ActivityMetadata {
  /** IP address of the actor when the activity occurred */
  ipAddress?: string;
  /** User agent string if the activity came from a browser */
  userAgent?: string;
  /** Geographic location information */
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
  /** Session identifier */
  sessionId?: string;
  /** Request identifier for tracing */
  requestId?: string;
  /** Additional custom properties */
  custom?: Record<string, any>;
}

/**
 * Complete activity event structure
 * 
 * This interface defines the normalized schema for all activity events in the system.
 * Each event represents a single action taken by an actor, optionally on a subject and/or target.
 */
export interface ActivityEvent {
  /** Unique identifier for this activity event */
  id: string;
  
  /** Schema version for backward compatibility and migration purposes */
  version: string;
  
  /** 
   * Type of activity that occurred (e.g., 'user.created', 'document.updated', 'file.deleted')
   * Should follow a hierarchical naming convention: category.action
   */
  type: string;
  
  /** ISO 8601 timestamp when the activity occurred */
  timestamp: string;
  
  /** The actor who performed this activity */
  actor: ActivityActor;
  
  /** Optional subject of the activity (what the activity is about) */
  subject?: ActivitySubject;
  
  /** Optional target of the activity (what is being acted upon) */
  target?: ActivityTarget;
  
  /** Human-readable description of the activity */
  description?: string;
  
  /** Additional metadata associated with this event */
  metadata?: ActivityMetadata;
  
  /** Timestamp when this event was recorded in the system */
  recordedAt: string;
}

/**
 * Input interface for creating new activity events
 * Makes some fields optional that will be auto-generated
 */
export interface CreateActivityEventInput {
  /** Type of activity that occurred */
  type: string;
  
  /** The actor who performed this activity */
  actor: ActivityActor;
  
  /** Optional subject of the activity */
  subject?: ActivitySubject;
  
  /** Optional target of the activity */
  target?: ActivityTarget;
  
  /** Human-readable description of the activity */
  description?: string;
  
  /** Additional metadata associated with this event */
  metadata?: ActivityMetadata;
  
  /** Optional custom timestamp (defaults to current time) */
  timestamp?: string;
}

/**
 * Common activity types used throughout the system
 */
export const ACTIVITY_TYPES = {
  // User activities
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  
  // Document activities
  DOCUMENT_CREATED: 'document.created',
  DOCUMENT_UPDATED: 'document.updated',
  DOCUMENT_DELETED: 'document.deleted',
  DOCUMENT_SHARED: 'document.shared',
  
  // File activities
  FILE_UPLOADED: 'file.uploaded',
  FILE_DOWNLOADED: 'file.downloaded',
  FILE_DELETED: 'file.deleted',
  
  // System activities
  SYSTEM_ERROR: 'system.error',
  SYSTEM_WARNING: 'system.warning',
} as const;

export type ActivityType = typeof ACTIVITY_TYPES[keyof typeof ACTIVITY_TYPES];
