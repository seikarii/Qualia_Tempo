import "@testing-library/jest-dom";
import "whatwg-fetch";
import React from 'react';
import { vi } from 'vitest';

// Mock decorators globally for all tests
vi.mock('./utils/decorators', () => ({
  logMethod: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
  catchError: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
  validate: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
  throttle: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
  validateEventProperty: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
}));

// Mock WebGL context
(global.HTMLCanvasElement.prototype as any).getContext = vi.fn(() => ({
  getExtension: vi.fn(),
  getShaderPrecisionFormat: vi.fn(() => ({
    precision: 1,
    rangeMin: 1,
    rangeMax: 1,
  })),
  getParameter: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock window methods
Object.defineProperty(window, 'requestAnimationFrame', {
  writable: true,
  value: vi.fn(cb => setTimeout(cb, 16))
});

Object.defineProperty(window, 'cancelAnimationFrame', {
  writable: true,
  value: vi.fn()
});

// Mock React Three Fiber components
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: any) => React.createElement('div', { 'data-testid': 'canvas' }, children),
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({ gl: {}, scene: {}, camera: {} })),
}));

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => React.createElement('div', { 'data-testid': 'orbit-controls' }),
  Text: ({ children }: any) => React.createElement('div', { 'data-testid': 'text' }, children),
}));

vi.mock('@react-three/postprocessing', () => ({
  EffectComposer: ({ children }: any) => React.createElement('div', { 'data-testid': 'effect-composer' }, children),
  Bloom: () => React.createElement('div', { 'data-testid': 'bloom' }),
  ChromaticAberration: () => React.createElement('div', { 'data-testid': 'chromatic-aberration' }),
}));

// Mock Tone.js to avoid audio context issues in tests
vi.mock('tone', () => ({
  __esModule: true,
  default: {},
  Synth: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockReturnThis(),
    triggerAttackRelease: vi.fn(),
    dispose: vi.fn(),
    toDestination: vi.fn().mockReturnThis(),
  })),
  Destination: {
    connect: vi.fn(),
  },
  Transport: {
    start: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    position: '0:0:0',
  },
  getContext: vi.fn().mockReturnValue({
    state: 'running',
    resume: vi.fn(),
  }),
  Frequency: vi.fn().mockImplementation((freq) => ({
    toNote: vi.fn().mockReturnValue(`C${Math.floor(freq / 100)}`),
    valueOf: vi.fn().mockReturnValue(freq),
  })),
  Oscillator: vi.fn().mockImplementation(() => ({
    toDestination: vi.fn().mockReturnThis(),
    start: vi.fn(),
    stop: vi.fn(),
    connect: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
  })),
  Reverb: vi.fn().mockImplementation(() => ({
    toDestination: vi.fn().mockReturnThis(),
    connect: vi.fn().mockReturnThis(),
  })),
  Filter: vi.fn().mockImplementation(() => ({
    toDestination: vi.fn().mockReturnThis(),
    connect: vi.fn().mockReturnThis(),
  })),
  Gain: vi.fn().mockImplementation(() => ({
    toDestination: vi.fn().mockReturnThis(),
    connect: vi.fn().mockReturnThis(),
  })),
}));