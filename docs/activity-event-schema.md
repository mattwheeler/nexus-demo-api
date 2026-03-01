# Activity Event Schema Documentation

This document describes the normalized, versioned schema for activity events in the system. Activity events represent actions taken by actors on subjects or targets within the application.

## Overview

The Activity Event schema follows the [Activity Streams 2.0](https://www.w3.org/TR/activitystreams-core/) specification principles but is tailored for our specific use case. Each activity event captures:

- **Who** performed the action (actor)
- **What** action was performed (type)
- **When** it happened (timestamp)
- **What** was acted upon (subject/target)
- **Additional context** (metadata)

## Schema Version

Current schema version: **1.0.0**

The schema includes a version field to support backward compatibility and future migrations.

## Core Fields

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier for this activity event |
| `version` | string | Schema version (semantic versioning) |
| `type` | string | Activity type following `category.action` format |
| `timestamp` | string | ISO 8601 timestamp when the activity occurred |
| `actor` | ActivityActor | The entity that performed the activity |
| `recordedAt` | string | ISO 8601 timestamp when event was recorded |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `subject` | ActivitySubject | What the activity is about |
| `target` | ActivityTarget | What is being acted upon |
| `description` | string | Human-readable description |
| `metadata` | ActivityMetadata | Additional context and tracking data |

## Field Definitions

### ActivityActor

Represents the entity that performed the activity.

```typescript
interface ActivityActor {
  id: string;           // Unique identifier
  type: 'user' | 'system' | 'service' | 'api';
  name?: string;        // Display name
  email?: string;       // Email (for users)
}
```

**Actor Types:**
- `user`: Human user of the system
- `system`: Internal system process
- `service`: External service or integration
- `api`: API client or application

### ActivitySubject

Represents what the activity is about (optional).

```typescript
interface ActivitySubject {
  id: string;           // Unique identifier
  type: string;         // Entity type (user, document, etc.)
  name?: string;        // Display name
  properties?: Record<string, any>; // Type-specific data
}
```

### ActivityTarget

Represents what is being acted upon (optional).

```typescript
interface ActivityTarget {
  id: string;           // Unique identifier
  type: string;         // Entity type (file, comment, etc.)
  name?: string;        // Display name
  properties?: Record<string, any>; // Type-specific data
}
```

### ActivityMetadata

Additional context and tracking information (optional).

```typescript
interface ActivityMetadata {
  ipAddress?: string;   // Client IP address
  userAgent?: string;   // Browser user agent
  location?: {          // Geographic information
    country?: string;
    region?: string;
    city?: string;
  };
  sessionId?: string;   // Session identifier
  requestId?: string;   // Request tracing ID
  custom?: Record<string, any>; // Custom properties
}
```

## Activity Types

Activity types follow a hierarchical naming convention: `category.action`

### Format Rules
- Lowercase letters and numbers only
- Category and action separated by a dot
- Must match regex: `^[a-z][a-z0-9]*\.[a-z][a-z0-9]*$`

### Common Activity Types

#### User Activities
- `user.created` - New user account created
- `user.updated` - User profile updated
- `user.deleted` - User account deleted
- `user.login` - User logged in
- `user.logout` - User logged out

#### Document Activities
- `document.created` - Document created
- `document.updated` - Document modified
- `document.deleted` - Document deleted
- `document.shared` - Document shared with others

#### File Activities
- `file.uploaded` - File uploaded
- `file.downloaded` - File downloaded
- `file.deleted` - File deleted

#### System Activities
- `system.error` - System error occurred
- `system.warning` - System warning issued

## Validation

The schema includes both runtime validation (using Zod) and static validation (JSON Schema):

### Runtime Validation (JavaScript/Node.js)
```javascript
const { validateActivityEvent } = require('./schemas/activityEventSchema');

const result = validateActivityEvent(eventData);
if (!result.success) {
  console.error('Validation failed:', result.issues);
}
```

### JSON Schema Validation
The JSON Schema is available at `src/schemas/activityEventJsonSchema.json` for use with JSON Schema validators.

## Example Events

### User Creation Event
```json
{
  "id": "evt_123456789",
  "version": "1.0.0",
  "type": "user.created",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "actor": {
    "id": "sys_admin",
    "type": "system",
    "name": "System Administrator"
  },
  "subject": {
    "id": "user_456",
    "type": "user",
    "name": "John Doe",
    "properties": {
      "email": "john.doe@example.com"
    }
  },
  "description": "New user account created",
  "metadata": {
    "ipAddress": "192.168.1.100",
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "requestId": "req_abc123"
  },
  "recordedAt": "2024-01-15T10:30:01.234Z"
}
```

### Document Update Event
```json
{
  "id": "evt_987654321",
  "version": "1.0.0",
  "type": "document.updated",
  "timestamp": "2024-01-15T14:45:30.000Z",
  "actor": {
    "id": "user_123",
    "type": "user",
    "name": "Jane Smith",
    "email": "jane.smith@example.com"
  },
  "target": {
    "id": "doc_789",
    "type": "document",
    "name": "Project Proposal",
    "properties": {
      "version": "2.1",
      "size": 15420
    }
  },
  "description": "Document content updated",
  "metadata": {
    "sessionId": "sess_xyz789",
    "requestId": "req_def456"
  },
  "recordedAt": "2024-01-15T14:45:31.123Z"
}
```

## Usage Guidelines

### When to Use Subject vs Target
- **Subject**: What the activity is fundamentally about
- **Target**: What is being directly acted upon
- **Example**: When sharing a document with a user:
  - Subject: The document being shared
  - Target: The user receiving access

### Timestamp vs RecordedAt
- **timestamp**: When the activity actually occurred
- **recordedAt**: When the system recorded the event
- These may differ due to processing delays or batch imports

### Metadata Best Practices
- Include tracking information (IP, user agent, session)
- Add request IDs for distributed tracing
- Use custom properties sparingly and document their purpose
- Consider privacy implications when storing user data

### Activity Type Naming
- Use clear, descriptive names
- Group related activities under the same category
- Avoid overly specific types that rarely occur
- Consider how activities will be queried and filtered

## Migration and Versioning

When updating the schema:
1. Increment the version number (semantic versioning)
2. Maintain backward compatibility for at least one major version
3. Document breaking changes and migration paths
4. Update validation schemas and TypeScript interfaces
5. Test with existing data to ensure compatibility
