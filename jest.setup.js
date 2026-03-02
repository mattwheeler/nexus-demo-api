// Set test environment
process.env.NODE_ENV = 'test';

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