// Global test setup — runs before every test file
import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './server';

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));

//  Close server after all tests
afterAll(() => server.close());

// Reset handlers after each test `important for test isolation`
afterEach(() => server.resetHandlers());
