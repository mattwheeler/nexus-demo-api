// Set test environment
process.env.NODE_ENV = 'test';

// Suppress console.log in tests unless needed
if (!process.env.VERBOSE_TESTS) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: console.error // Keep error logging
  };
}