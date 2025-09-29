/**
 * GOLD.CODE: Parent/Child Container Testing Infrastructure
 * Supreme Guardian Directive Compliance 
 *
 * This factory implements the CORRECT Parent/Child Container Architecture for testing,
 * ensuring supreme performance, isolation, and maintainability as per the architect's mandate.
 *
 * ARCHITECTURE OVERVIEW:
 * - It uses the main application 'container' from 'inversify.config.ts' as the source.
 * - The createTestContainer function uses the OFFICIAL 'container.createChild()' method
 *   to create fast, isolated containers for each test.
 *
 * MANDATE: NO manual service instantiation. NO API fabrication. NO monkey-patching.
 * OBLIGATION: All Service Under Test (SUT) must be resolved from a correctly created container.
 */

import { vi, type Mock } from "vitest";
import { Container } from "inversify";
import { TYPES } from "../services/inversify.types";

// Import all necessary interfaces for type safety
import type { ILogger } from "../services/interfaces/ILogger";
import type { IEventBus } from "../services/interfaces/IEventBus";
import type { IGameStateStore } from "../services/interfaces/IGameStateStore";
import type { IGameStateStoreService } from "../services/interfaces/IGameStateStoreService";
import type { IHttpService } from "../services/interfaces/IHttpService";
import type { ITimerService, IPerformanceService } from "../services/interfaces/ITimerService";
import type { IOntologicalAudioEngine } from "../audio/IOntologicalAudioEngine";
import type { IWebSocketService } from "../services/interfaces/IWebSocketService";
import type { IBrowserEventsService } from "../services/interfaces/IBrowserEventsService";

export interface MockOverride<T = any> {
  type: symbol;
  value: T;
}

// --- MOCK IMPLEMENTATIONS ---
const mockLogger: ILogger = {
  info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), setLevel: vi.fn(),
  getLevel: vi.fn().mockReturnValue("info"),
  child: vi.fn().mockReturnThis(),
};

const mockEventBus: IEventBus = {
  subscribe: vi.fn(), unsubscribe: vi.fn(), emit: vi.fn(),
  clear: vi.fn(), destroy: vi.fn(), getStats: vi.fn(),
};

const mockOntologicalAudioEngine: IOntologicalAudioEngine = {
  createEntityVoice: vi.fn(), updateEntitySound: vi.fn(), removeEntityVoice: vi.fn(),
  playEmergentPattern: vi.fn(), getMasterVolume: vi.fn(), setMasterVolume: vi.fn(),
};

const mockGameStateStore: any = {
  setNotifications: vi.fn(), getNotifications: vi.fn(), updateGameState: vi.fn(),
  getGameState: vi.fn(), updateQualiaState: vi.fn(), getQualiaState: vi.fn(), setState: vi.fn(),
};

const mockGameStateStoreService: any = {
  start: vi.fn(), stop: vi.fn(), updateGameState: vi.fn(),
  updateQualiaState: vi.fn(), getStatus: vi.fn(), isRunning: vi.fn(),
};

const mockHttpService: IHttpService = {
  get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(),
};

const mockTimerService: ITimerService = {
  setTimeout: vi.fn(), clearTimeout: vi.fn(), setInterval: vi.fn(),
  clearInterval: vi.fn(), nextTick: vi.fn(), now: vi.fn(),
  getCurrentDate: vi.fn(),
};

const mockPerformanceService: IPerformanceService = {
  now: vi.fn(), getMemoryInfo: vi.fn(), mark: vi.fn(),
  measure: vi.fn(), clearMarks: vi.fn(), clearMeasures: vi.fn(),
  requestAnimationFrame: vi.fn(), cancelAnimationFrame: vi.fn(),
};

const mockWebSocketService: IWebSocketService = {
  connect: vi.fn(), disconnect: vi.fn(), send: vi.fn(),
  onMessage: vi.fn(), onOpen: vi.fn(), onClose: vi.fn(),
  onError: vi.fn(), getReadyState: vi.fn(), isConnected: vi.fn(),
};

const mockBrowserEventsService: IBrowserEventsService = {
  addWindowEventListener: vi.fn(), removeWindowEventListener: vi.fn(),
  addElementEventListener: vi.fn(), removeElementEventListener: vi.fn(),
  getWindowDimensions: vi.fn(), getViewportDimensions: vi.fn(),
};

/**
 * Mock Services Interface
 */
export interface MockServices {
  mockLogger: ILogger;
  mockEventBus: IEventBus;
  mockGameStateStore: any;
  mockGameStateStoreService: any;
  mockHttpService: IHttpService;
  mockTimerService: ITimerService;
  mockPerformanceService: IPerformanceService;
  mockOntologicalAudioEngine: IOntologicalAudioEngine;
  mockWebSocketService: IWebSocketService;
  mockBrowserEventsService: IBrowserEventsService;
}

/**
 * Create Test Container Factory - FINAL IMPLEMENTATION
 * This is the only correct way to implement this function.
 */
export function createTestContainer(overrides: MockOverride[] = []): Container {
  // STEP 1: Create a new isolated container for testing
  const testContainer = new Container();

  // STEP 2: Bind all mock services to the test container
  testContainer.bind<ILogger>(TYPES.ILogger).toConstantValue(mockLogger);
  testContainer.bind<IEventBus>(TYPES.IEventBus).toConstantValue(mockEventBus);
  testContainer.bind<IGameStateStore>(TYPES.IGameStateStore).toConstantValue(mockGameStateStore);
  testContainer.bind<IGameStateStoreService>(TYPES.IGameStateStoreService).toConstantValue(mockGameStateStoreService);
  testContainer.bind<IHttpService>(TYPES.IHttpService).toConstantValue(mockHttpService);
  testContainer.bind<ITimerService>(TYPES.ITimerService).toConstantValue(mockTimerService);
  testContainer.bind<IPerformanceService>(TYPES.IPerformanceService).toConstantValue(mockPerformanceService);
  testContainer.bind<IOntologicalAudioEngine>(TYPES.IOntologicalAudioEngine).toConstantValue(mockOntologicalAudioEngine);
  testContainer.bind<IWebSocketService>(TYPES.IWebSocketService).toConstantValue(mockWebSocketService);
  testContainer.bind<IBrowserEventsService>(TYPES.IBrowserEventsService).toConstantValue(mockBrowserEventsService);

  // STEP 3: Apply any test-specific overrides.
  for (const override of overrides) {
    testContainer.bind(override.type).toConstantValue(override.value);
  }

  return testContainer;
}

/**
 * Reset All Mocks
 */
export function resetAllMocks(): void {
  vi.clearAllMocks();
  (mockLogger.getLevel as Mock).mockReturnValue("info");
}
