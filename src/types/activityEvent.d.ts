import { z } from 'zod';

/**
 * Common activity event types
 */
export declare const ACTIVITY_EVENT_TYPES: {
  readonly USER_CREATED: 'user.created';
  readonly USER_UPDATED: 'user.updated';
  readonly USER_DELETED: 'user.deleted';
  readonly USER_LOGIN: 'user.login';
  readonly USER_LOGOUT: 'user.logout';
  readonly RESOURCE_CREATED: 'resource.created';
  readonly RESOURCE_UPDATED: 'resource.updated';
  readonly RESOURCE_DELETED: 'resource.deleted';
  readonly RESOURCE_VIEWED: 'resource.viewed';
  readonly SYSTEM_EVENT: 'system.event';
};

/**
 * Activity event actor interface
 * Represents the entity that performed the action
 */
export interface ActivityEventActor {
  /** Unique identifier for the actor */
  id: string;
  /** Type of actor (e.g., 'user', 'system', 'service') */
  type: string;
  /** Display name for the actor */
  name?: string;
  /** Additional actor metadata */
  metadata?: Record<string, any>;
}

/**
 * Activity event subject interface
 * Represents the primary entity that was acted upon
 */
export interface ActivityEventSubject {
  /** Unique identifier for the subject */
  id: string;
  /** Type of subject (e.g., 'user', 'post', 'comment') */
  type: string;
  /** Display name for the subject */
  name?: string;
  /** Additional subject metadata */
  metadata?: Record<string, any>;
}

/**
 * Activity event target interface
 * Represents the secondary entity involved in the action (optional)
 */
export interface ActivityEventTarget {
  /** Unique identifier for the target */
  id: string;
  /** Type of target (e.g., 'group', 'project', 'organization') */
  type: string;
  /** Display name for the target */
  name?: string;
  /** Additional target metadata */
  metadata?: Record<string, any>;
}

/**
 * Complete activity event interface
 */
export interface ActivityEvent {
  /** Unique identifier for the activity event */
  id?: string;
  /** Type of activity event (e.g., 'user.created', 'resource.updated') */
  type: string;
  /** ISO 8601 timestamp when the event occurred */
  timestamp?: string;
  /** The entity that performed the action */
  actor: ActivityEventActor;
  /** The primary entity that was acted upon */
  subject: ActivityEventSubject;
  /** The secondary entity involved in the action (optional) */
  target?: ActivityEventTarget;
  /** Additional event-specific data */
  metadata?: Record<string, any>;
}

/**
 * Pagination metadata interface for API responses
 */
export interface PaginationMeta {
  /** Whether there are more results available */
  hasMore: boolean;
  /** Cursor for fetching the next page of results */
  nextCursor?: string;
  /** Total count of items (optional, may be expensive to compute) */
  total?: number;
  /** Current page size */
  limit?: number;
  /** Current offset or page number */
  offset?: number;
}

/**
 * API response wrapper for activity events with pagination
 */
export interface ActivityEventResponse {
  /** Array of activity events */
  data: ActivityEvent[];
  /** Pagination metadata */
  pagination: PaginationMeta;
}

/**
 * Single activity event response interface
 */
export interface SingleActivityEventResponse {
  /** Single activity event */
  data: ActivityEvent;
}

// Zod schema exports
export declare const actorSchema: z.ZodType<ActivityEventActor>;
export declare const subjectSchema: z.ZodType<ActivityEventSubject>;
export declare const targetSchema: z.ZodOptional<z.ZodType<ActivityEventTarget>>;
export declare const activityEventSchema: z.ZodType<ActivityEvent>;
export declare const paginationMetaSchema: z.ZodType<PaginationMeta>;
export declare const activityEventResponseSchema: z.ZodType<ActivityEventResponse>;
export declare const singleActivityEventResponseSchema: z.ZodType<SingleActivityEventResponse>;