import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Comprehensive browser APIs mocking for test environment
// Ensure global window object exists
if (typeof window === 'undefined') {
  global.window = {} as any;
}

// Mock browser timing APIs
Object.defineProperty(window, 'setInterval', {
  writable: true,
  value: vi.fn(() => 123), // Return a mock timer ID
});

Object.defineProperty(window, 'clearInterval', {
  writable: true,
  value: vi.fn(), // No-op function
});

Object.defineProperty(window, 'setTimeout', {
  writable: true,
  value: vi.fn(() => 456), // Return a mock timer ID
});

Object.defineProperty(window, 'clearTimeout', {
  writable: true,
  value: vi.fn(), // No-op function
});

// Mock performance API
Object.defineProperty(window, 'performance', {
  writable: true,
  value: {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByType: vi.fn(() => []),
    getEntriesByName: vi.fn(() => []),
    timeOrigin: 0,
    timing: {
      navigationStart: Date.now(),
      loadEventEnd: Date.now(),
    },
  },
});

// Mock requestAnimationFrame/cancelAnimationFrame
Object.defineProperty(window, 'requestAnimationFrame', {
  writable: true,
  value: vi.fn((callback: FrameRequestCallback) => {
    return globalThis.setTimeout(callback, 16); // ~60fps
  }),
});

Object.defineProperty(window, 'cancelAnimationFrame', {
  writable: true,
  value: vi.fn((id: number) => {
    globalThis.clearTimeout(id as any);
  }),
});

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  writable: true,
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  },
});

afterEach(() => {
  cleanup();
});
