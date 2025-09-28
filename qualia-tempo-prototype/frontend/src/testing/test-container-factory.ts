/**
 * GOLD.CODE: Parent/Child Container Testing Infrastructure
 * Supreme Guardian Directive Compliance - QUALIA.CODE v1.1
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
import { container } from "../services/inversify.config"; // The REAL container

// Import all necessary interfaces for type safety
import type { ILogger } from "../services/interfaces/ILogger";
import type { IEventBus } from "../services/interfaces/IEventBus";
import type { IGameStateStore } from "../services/interfaces/IGameStateStore";
import type { IGameStateStoreService } from "../services/interfaces/IGameStateStoreService";
import type { IHttpService } from "../services/interfaces/IHttpService";
import type { ITimerService, IPerformanceService } from "../services/interfaces/ITimerService";
import type { IOntologicalAudioEngine } from "../audio/IOntologicalAudioEngine";
import type { IStreamingVideoService } from "../services/interfaces/IStreamingVideoService";

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
  get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), updateConfig: vi.fn(),
};

const mockTimerService: ITimerService = {
  setTimeout: vi.fn(), clearTimeout: vi.fn(), setInterval: vi.fn(),
  clearInterval: vi.fn(), nextTick: vi.fn(), now: vi.fn(),
};

const mockPerformanceService: IPerformanceService = {
  now: vi.fn(), getMemoryInfo: vi.fn(), mark: vi.fn(),
  measure: vi.fn(), clearMarks: vi.fn(), clearMeasures: vi.fn(),
};

const mockStreamingVideoService: IStreamingVideoService = {
  connect: vi.fn(), disconnect: vi.fn(), subscribeToFrames: vi.fn(), unsubscribeFromFrames: vi.fn(),
  getConnectionStatus: vi.fn(), getStatistics: vi.fn(), requestQualityChange: vi.fn(),
  requestFpsChange: vi.fn(), ping: vi.fn(),
};

/**
 * Create Test Container Factory - FINAL IMPLEMENTATION
 * This is the only correct way to implement this function.
 */
export function createTestContainer(overrides: MockOverride[] = []): Container {
  // STEP 1: Use the OFFICIAL InversifyJS API to create a child container.
  const childContainer = container.createChild();

  // STEP 2: Use the OFFICIAL 'rebind' method to replace bindings with mocks.
  childContainer.rebind<ILogger>(TYPES.ILogger).toConstantValue(mockLogger);
  childContainer.rebind<IEventBus>(TYPES.IEventBus).toConstantValue(mockEventBus);
  childContainer.rebind<IGameStateStore>(TYPES.IGameStateStore).toConstantValue(mockGameStateStore);
  childContainer.rebind<IGameStateStoreService>(TYPES.IGameStateStoreService).toConstantValue(mockGameStateStoreService);
  childContainer.rebind<IHttpService>(TYPES.IHttpService).toConstantValue(mockHttpService);
  childContainer.rebind<ITimerService>(TYPES.ITimerService).toConstantValue(mockTimerService);
  childContainer.rebind<IPerformanceService>(TYPES.IPerformanceService).toConstantValue(mockPerformanceService);
  childContainer.rebind<IStreamingVideoService>(TYPES.IStreamingVideoService).toConstantValue(mockStreamingVideoService);
  childContainer.rebind<IOntologicalAudioEngine>(TYPES.IOntologicalAudioEngine).toConstantValue(mockOntologicalAudioEngine);
  childContainer.rebind<(_state: any) => void>(TYPES.StoreSetter).toConstantValue(vi.fn());

  // STEP 3: Apply any test-specific overrides.
  for (const override of overrides) {
    childContainer.rebind(override.type).toConstantValue(override.value);
  }

  return childContainer;
}

/**
 * Get Mock Instances from Container
 */
export function getMocksFromContainer(container: Container) {
  return {
    mockLogger: container.get<ILogger>(TYPES.ILogger),
    mockEventBus: container.get<IEventBus>(TYPES.IEventBus),
    mockGameStateStore: container.get<IGameStateStore>(TYPES.IGameStateStore),
    mockGameStateStoreService: container.get<IGameStateStoreService>(TYPES.IGameStateStoreService),
    mockHttpService: container.get<IHttpService>(TYPES.IHttpService),
    mockTimerService: container.get<ITimerService>(TYPES.ITimerService),
    mockPerformanceService: container.get<IPerformanceService>(TYPES.IPerformanceService),
    mockStreamingVideoService: container.get<IStreamingVideoService>(TYPES.IStreamingVideoService),
    mockOntologicalAudioEngine: container.get<IOntologicalAudioEngine>(TYPES.IOntologicalAudioEngine),
    mockStoreSetter: container.get<(_state: any) => void>(TYPES.StoreSetter),
  };
}

/**
 * Reset All Mocks
 */
export function resetAllMocks(): void {
  vi.clearAllMocks();
  (mockLogger.getLevel as Mock).mockReturnValue("info");
}
