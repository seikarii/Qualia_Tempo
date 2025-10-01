import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// ÚNICA FUENTE DE VERDAD PARA MOCKS DE DECORADORES
vi.mock("../utils/decorators", () => ({
  logMethod: vi.fn().mockImplementation(() => (d: unknown) => d),
  catchError: vi.fn().mockImplementation(() => (d: unknown) => d),
  validate: vi.fn().mockImplementation(() => (d: unknown) => d),
  throttle: vi.fn().mockImplementation(() => (d: unknown) => d),
  validateEventProperty: vi.fn().mockImplementation(() => (d: unknown) => d),
  measureTime: vi.fn().mockImplementation(() => (d: unknown) => d),
  qualiaMethod: vi.fn().mockImplementation(() => (d: unknown) => d),
}));

// QUALIA.CODE Global Tone.js Mock - Prevent audio module import errors in tests
vi.mock("tone", () => ({
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

// Mock the specific Tone.js ESM modules that might be imported
vi.mock("tone/build/esm/core/Global", () => ({
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

vi.mock("tone/build/esm/core/Tone", () => ({
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

vi.mock("tone/build/esm/core/AudioContext", () => ({
  default: vi.fn().mockImplementation(() => ({
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
    state: "running",
    resume: vi.fn(),
    suspend: vi.fn(),
    close: vi.fn(),
  })),
}));

vi.mock("tone/build/esm/source/Oscillator", () => ({
  default: vi.fn(() => ({
    toDestination: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    frequency: { value: 440 },
    type: "sine",
  })),
}));

vi.mock("tone/build/esm/component/Filter", () => ({
  default: vi.fn(() => ({
    toDestination: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
    connect: vi.fn().mockReturnThis(),
    frequency: { value: 1000 },
    Q: { value: 1 },
  })),
}));

vi.mock("tone/build/esm/component/Envelope", () => ({
  default: vi.fn(() => ({
    connect: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
    triggerAttack: vi.fn(),
    triggerRelease: vi.fn(),
  })),
}));

vi.mock("tone/build/esm/effect/Reverb", () => ({
  default: vi.fn(() => ({
    toDestination: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
    connect: vi.fn().mockReturnThis(),
  })),
}));

vi.mock("tone/build/esm/effect/Distortion", () => ({
  default: vi.fn(() => ({
    toDestination: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
    connect: vi.fn().mockReturnThis(),
  })),
}));

vi.mock("tone/build/esm/instrument/MonoSynth", () => ({
  default: vi.fn(() => ({
    toDestination: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
    triggerAttackRelease: vi.fn(),
    set: vi.fn(),
  })),
}));

vi.mock("tone/build/esm/instrument/FMSynth", () => ({
  default: vi.fn(() => ({
    toDestination: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
    triggerAttackRelease: vi.fn(),
    set: vi.fn(),
  })),
}));

vi.mock("tone/build/esm/index", () => ({
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
  Frequency: vi.fn(() => ({ toFrequency: vi.fn().mockReturnValue(440) })),
  start: vi.fn(),
  Transport: {
    start: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    bpm: { value: 120 },
  },
}));

// QUALIA.CODE Global Electron Mock - Prevent electron module import errors in tests
vi.mock("electron", () => ({
  app: {
    requestSingleInstanceLock: vi.fn(() => true),
    on: vi.fn(),
    quit: vi.fn(),
    getVersion: vi.fn(() => "1.0.0"),
    getName: vi.fn(() => "Qualia Tempo"),
    getPath: vi.fn(() => "/tmp"),
    setAppUserModelId: vi.fn(),
    commandLine: {
      appendSwitch: vi.fn(),
    },
  },
  BrowserWindow: vi.fn().mockImplementation(() => ({
    loadURL: vi.fn(),
    loadFile: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
    close: vi.fn(),
    destroy: vi.fn(),
    isDestroyed: vi.fn(() => false),
    webContents: {
      on: vi.fn(),
      once: vi.fn(),
      send: vi.fn(),
      openDevTools: vi.fn(),
      closeDevTools: vi.fn(),
      setWindowOpenHandler: vi.fn(),
    },
    setMenuBarVisibility: vi.fn(),
    setFullScreen: vi.fn(),
    isFullScreen: vi.fn(() => false),
    getBounds: vi.fn(() => ({ x: 0, y: 0, width: 1920, height: 1080 })),
    setBounds: vi.fn(),
  })),
  ipcMain: {
    on: vi.fn(),
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
  Menu: {
    setApplicationMenu: vi.fn(),
    buildFromTemplate: vi.fn(() => ({})),
  },
  dialog: {
    showMessageBox: vi.fn(),
    showOpenDialog: vi.fn(),
    showSaveDialog: vi.fn(),
  },
  screen: {
    getPrimaryDisplay: vi.fn(() => ({
      workAreaSize: { width: 1920, height: 1080 },
      size: { width: 1920, height: 1080 },
    })),
    getAllDisplays: vi.fn(() => [
      {
        workAreaSize: { width: 1920, height: 1080 },
        size: { width: 1920, height: 1080 },
      },
    ]),
  },
  shell: {
    openExternal: vi.fn(),
  },
  globalShortcut: {
    register: vi.fn(() => true),
    unregister: vi.fn(),
    isRegistered: vi.fn(() => false),
  },
}));

// Comprehensive browser APIs mocking for test environment
// Ensure global window object exists
if (typeof window === "undefined") {
  (global as any).window = {} as any;
}

// Mock browser timing APIs with enhanced stability
const mockSetInterval = vi.fn(() => 123); // Return a mock timer ID
const mockClearInterval = vi.fn(); // No-op function
const mockSetTimeout = vi.fn(() => 456); // Return a mock timer ID
const mockClearTimeout = vi.fn(); // No-op function

Object.defineProperty(window, "setInterval", {
  writable: true,
  configurable: true,
  value: mockSetInterval,
});

Object.defineProperty(window, "clearInterval", {
  writable: true,
  configurable: true,
  value: mockClearInterval,
});

Object.defineProperty(window, "setTimeout", {
  writable: true,
  configurable: true,
  value: mockSetTimeout,
});

Object.defineProperty(window, "clearTimeout", {
  writable: true,
  configurable: true,
  value: mockClearTimeout,
});

// Also mock on global for maximum compatibility
Object.defineProperty(global, "setInterval", {
  writable: true,
  configurable: true,
  value: mockSetInterval,
});

Object.defineProperty(global, "clearInterval", {
  writable: true,
  configurable: true,
  value: mockClearInterval,
});

// Mock performance API
Object.defineProperty(window, "performance", {
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
Object.defineProperty(window, "requestAnimationFrame", {
  writable: true,
  value: vi.fn((callback: FrameRequestCallback) => {
    return globalThis.setTimeout(callback, 16); // ~60fps
  }),
});

Object.defineProperty(window, "cancelAnimationFrame", {
  writable: true,
  value: vi.fn((id: number) => {
    globalThis.clearTimeout(id);
  }),
});

// Mock localStorage
Object.defineProperty(window, "localStorage", {
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
Object.defineProperty(window, "AudioContext", {
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
    state: "running",
    resume: vi.fn(),
    suspend: vi.fn(),
    close: vi.fn(),
  })),
});

// Also add webkitAudioContext fallback
Object.defineProperty(window, "webkitAudioContext", {
  writable: true,
  value: window.AudioContext,
});

afterEach(() => {
  cleanup();
});
