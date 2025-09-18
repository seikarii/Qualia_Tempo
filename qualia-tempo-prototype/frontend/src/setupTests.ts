import "@testing-library/jest-dom";
import "whatwg-fetch";
import React from 'react';

// Mock decorators globally for all tests
jest.mock('./utils/decorators', () => ({
  logMethod: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
  catchError: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
  validate: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
  throttle: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
  validateEventProperty: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
}));

// Mock WebGL context
(global.HTMLCanvasElement.prototype as any).getContext = jest.fn(() => ({
  getExtension: jest.fn(),
  getShaderPrecisionFormat: jest.fn(() => ({
    precision: 1,
    rangeMin: 1,
    rangeMax: 1,
  })),
  getParameter: jest.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock window methods
Object.defineProperty(window, 'requestAnimationFrame', {
  writable: true,
  value: jest.fn(cb => setTimeout(cb, 16))
});

Object.defineProperty(window, 'cancelAnimationFrame', {
  writable: true,
  value: jest.fn()
});

// Mock React Three Fiber components
jest.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: any) => React.createElement('div', { 'data-testid': 'canvas' }, children),
  useFrame: jest.fn(),
  useThree: jest.fn(() => ({ gl: {}, scene: {}, camera: {} })),
}));

jest.mock('@react-three/drei', () => ({
  OrbitControls: () => React.createElement('div', { 'data-testid': 'orbit-controls' }),
  Text: ({ children }: any) => React.createElement('div', { 'data-testid': 'text' }, children),
}));

jest.mock('@react-three/postprocessing', () => ({
  EffectComposer: ({ children }: any) => React.createElement('div', { 'data-testid': 'effect-composer' }, children),
  Bloom: () => React.createElement('div', { 'data-testid': 'bloom' }),
  ChromaticAberration: () => React.createElement('div', { 'data-testid': 'chromatic-aberration' }),
}));

// Mock Tone.js to avoid audio context issues in tests
jest.mock('tone', () => ({
  __esModule: true,
  default: {},
  Synth: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    triggerAttackRelease: jest.fn(),
    dispose: jest.fn(),
  })),
  Destination: {},
  Transport: {
    start: jest.fn(),
    stop: jest.fn(),
    pause: jest.fn(),
    position: '0:0:0',
  },
  getContext: jest.fn().mockReturnValue({
    state: 'running',
    resume: jest.fn(),
  }),
}));

// Mock Tone.js completely
jest.mock('tone', () => ({
  __esModule: true,
  default: {
    Transport: {
      start: jest.fn(),
      stop: jest.fn(),
      pause: jest.fn(),
      bpm: { value: 120 },
      position: '0:0:0'
    },
    context: {
      state: 'running',
      resume: jest.fn().mockResolvedValue(undefined),
    }
  },
  Oscillator: jest.fn().mockImplementation(() => ({
    toDestination: jest.fn().mockReturnThis(),
    start: jest.fn(),
    stop: jest.fn(),
    frequency: { value: 440 }
  })),
  Reverb: jest.fn().mockImplementation(() => ({
    toDestination: jest.fn().mockReturnThis(),
    wet: { value: 0.3 }
  })),
  Filter: jest.fn().mockImplementation(() => ({
    toDestination: jest.fn().mockReturnThis(),
    frequency: { value: 440 }
  })),
  Gain: jest.fn().mockImplementation(() => ({
    toDestination: jest.fn().mockReturnThis(),
    gain: { value: 0.5 }
  })),
}));