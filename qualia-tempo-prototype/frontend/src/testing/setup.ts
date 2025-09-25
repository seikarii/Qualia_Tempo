import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// QUALIA.CODE Global Decorator Mocks - CRITICAL FOR IOC TEST INTEGRITY
// Mock decorators GLOBALLY to prevent import resolution issues
vi.mock('../utils/decorators', () => ({
  logMethod: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
  catchError: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
  validate: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
  throttle: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
  validateEventProperty: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
  measureTime: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
}));

// QUALIA.CODE Global Tone.js Mock - Prevent audio module import errors in tests
vi.mock('tone', () => ({
  PolySynth: vi.fn(() => ({
    toDestination: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
    triggerAttackRelease: vi.fn(),
    set: vi.fn(),
  })),
  Synth: vi.fn(() => ({
    toDestination: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
    triggerAttackRelease: vi.fn(),
    set: vi.fn(),
  })),
  Frequency: vi.fn(() => ({ toFrequency: vi.fn().mockReturnValue(440) })),
  Reverb: vi.fn(() => ({
    toDestination: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
    connect: vi.fn().mockReturnThis(),
  })),
  FeedbackDelay: vi.fn(() => ({
    toDestination: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
    connect: vi.fn().mockReturnThis(),
  })),
  Volume: vi.fn(() => ({
    toDestination: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
    connect: vi.fn().mockReturnThis(),
  })),
  start: vi.fn(),
  Transport: {
    start: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    bpm: { value: 120 },
  },
  default: {
    start: vi.fn(),
    Transport: {
      start: vi.fn(),
      stop: vi.fn(),
      pause: vi.fn(),
      bpm: { value: 120 },
    },
  },
}));

// Comprehensive browser APIs mocking for test environment
// Ensure global window object exists
if (typeof window === 'undefined') {
  global.window = {} as any;
}

// Mock browser timing APIs with enhanced stability
const mockSetInterval = vi.fn(() => 123); // Return a mock timer ID
const mockClearInterval = vi.fn(); // No-op function
const mockSetTimeout = vi.fn(() => 456); // Return a mock timer ID
const mockClearTimeout = vi.fn(); // No-op function

Object.defineProperty(window, 'setInterval', {
  writable: true,
  configurable: true,
  value: mockSetInterval,
});

Object.defineProperty(window, 'clearInterval', {
  writable: true,
  configurable: true,
  value: mockClearInterval,
});

Object.defineProperty(window, 'setTimeout', {
  writable: true,
  configurable: true,
  value: mockSetTimeout,
});

Object.defineProperty(window, 'clearTimeout', {
  writable: true,
  configurable: true,
  value: mockClearTimeout,
});

// Also mock on global for maximum compatibility
Object.defineProperty(global, 'setInterval', {
  writable: true,
  configurable: true,
  value: mockSetInterval,
});

Object.defineProperty(global, 'clearInterval', {
  writable: true,
  configurable: true,
  value: mockClearInterval,
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

// Mock AudioContext for WebAudioAPIService
Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    createGain: vi.fn(() => ({
      connect: vi.fn(),
      gain: { value: 1 },
    })),
    createOscillator: vi.fn(() => ({
      connect: vi.fn(),
      frequency: { value: 440 },
      start: vi.fn(),
      stop: vi.fn(),
    })),
    destination: {},
    state: 'running',
    resume: vi.fn(),
    suspend: vi.fn(),
    close: vi.fn(),
  })),
});

// Also add webkitAudioContext fallback
Object.defineProperty(window, 'webkitAudioContext', {
  writable: true,
  value: window.AudioContext,
});

afterEach(() => {
  cleanup();
});
