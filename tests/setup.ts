// Test setup file
export {};

// Set test environment
process.env.NODE_ENV = 'test';

// Mock fetch globally for tests
global.fetch = jest.fn(); 