// Set test environment
process.env.NODE_ENV = 'test';

// Mock better-sqlite3 to avoid binary issues in test environments
jest.mock('better-sqlite3', () => {
  const mockData = {
    users: [],
    activity_events: [],
    lastInsertRowid: 0
  };
  
  return jest.fn().mockImplementation(() => ({
    prepare: jest.fn((sql) => ({
      get: jest.fn((...params) => {
        if (sql.includes('SELECT * FROM users WHERE id = ?')) {
          const user = mockData.users.find(u => u.id === params[0]);
          return user || null;
        }
        if (sql.includes('SELECT id, user_id, type, description, created_at')) {
          const userId = params[0];
          let events = mockData.activity_events.filter(e => e.user_id === userId);
          
          // Apply type filter if provided
          if (params.length > 1 && sql.includes('AND type = ?')) {
            events = events.filter(e => e.type === params[1]);
          }
          
          // Apply cursor filter if provided
          if (sql.includes('AND created_at < ?')) {
            const cursorDate = params[params.length - 2];
            events = events.filter(e => e.created_at < cursorDate);
          }
          
          // Sort and limit
          events.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          const limit = params[params.length - 1];
          return events.slice(0, limit)[0] || null;
        }
        return null;
      }),
      all: jest.fn((...params) => {
        if (sql.includes('SELECT id, user_id, type, description, created_at')) {
          const userId = params[0];
          let events = mockData.activity_events.filter(e => e.user_id === userId);
          
          // Apply type filter if provided
          if (params.length > 1 && sql.includes('AND type = ?')) {
            events = events.filter(e => e.type === params[1]);
          }
          
          // Apply cursor filter if provided
          if (sql.includes('AND created_at < ?')) {
            const cursorDate = params[params.length - 2];
            events = events.filter(e => e.created_at < cursorDate);
          }
          
          // Sort and limit
          events.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          const limit = params[params.length - 1];
          return events.slice(0, limit);
        }
        return [];
      }),
      run: jest.fn((...params) => {
        if (sql.includes('INSERT INTO users')) {
          const id = ++mockData.lastInsertRowid;
          const user = {
            id,
            name: params[0],
            email: params[1],
            created_at: new Date().toISOString()
          };
          mockData.users.push(user);
          return { lastInsertRowid: id };
        }
        if (sql.includes('INSERT INTO activity_events')) {
          const id = ++mockData.lastInsertRowid;
          const event = {
            id,
            user_id: params[0],
            type: params[1],
            description: params[2],
            created_at: new Date().toISOString()
          };
          mockData.activity_events.push(event);
          return { lastInsertRowid: id };
        }
        return { lastInsertRowid: 0 };
      })
    })),
    exec: jest.fn(), // Mock table creation
    close: jest.fn()
  }));
});

// Global test setup
beforeAll(() => {
  // Any global setup needed for tests
});

afterAll(() => {
  // Any global cleanup needed after tests
});

// Suppress console logs during tests unless needed
if (!process.env.VERBOSE_TESTS) {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
}