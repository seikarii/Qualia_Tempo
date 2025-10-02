/**
 * GOLD.CODE: Isolated Container Testing Infrastructure
 * Supreme Guardian Directive Compliance
 *
 * This factory implements the CORRECT Isolated Container Architecture for testing,
 * ensuring supreme performance, isolation, and maintainability as per the architect's mandate.
 *
 * ARCHITECTURE OVERVIEW:
 * - The createTestContainer function creates a completely new Container() for each test
 *   to guarantee total isolation and prevent cross-contamination between tests.
 * - All mock services are centralized in src/testing/mocks/ directory for maintainability.
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
import type { ITimerService } from "../services/interfaces/ITimerService";
import type { IPerformanceService } from "../services/interfaces/IPerformanceService";
import type { IOntologicalAudioEngine } from "../audio/IOntologicalAudioEngine";
import type { IWebSocketService } from "../services/interfaces/IWebSocketService";
import type { IBrowserEventsService } from "../services/interfaces/IBrowserEventsService";
import type { IDebugOrchestratorService } from "../services/interfaces/IDebugOrchestratorService";
import type { IShaderIntrospectionService } from "../services/interfaces/IShaderIntrospectionService";

// Import centralized mocks
import { mockLogger } from "./mocks/logger.mock";
import { mockEventBus } from "./mocks/event-bus.mock";
import { mockOntologicalAudioEngine } from "./mocks/ontological-audio-engine.mock";
import { mockGameStateStore } from "./mocks/game-state-store.mock";
import { mockGameStateStoreService } from "./mocks/game-state-store-service.mock";
import { mockHttpService } from "./mocks/http-service.mock";
import { mockTimerService } from "./mocks/timer-service.mock";
import { mockPerformanceService } from "./mocks/performance-service.mock";
import { mockWebSocketService } from "./mocks/web-socket-service.mock";
import { mockBrowserEventsService } from "./mocks/browser-events-service.mock";
import { mockDebugOrchestratorService } from "./mocks/debug-orchestrator-service.mock";
import { mockShaderIntrospectionService } from "./mocks/shader-introspection-service.mock";

export interface MockOverride<T = unknown> {
  type: symbol;
  value: T;
}

// --- MOCK IMPLEMENTATIONS ARE NOW CENTRALIZED IN src/testing/mocks/ ---

/**
 * Mock Services Interface
 */
export interface MockServices {
  mockLogger: ILogger;
  mockEventBus: IEventBus;
  mockGameStateStore: IGameStateStore;
  mockGameStateStoreService: IGameStateStoreService;
  mockHttpService: IHttpService;
  mockTimerService: ITimerService;
  mockPerformanceService: IPerformanceService;
  mockOntologicalAudioEngine: IOntologicalAudioEngine;
  mockWebSocketService: IWebSocketService;
  mockBrowserEventsService: IBrowserEventsService;
  mockDebugOrchestratorService: IDebugOrchestratorService;
  mockShaderIntrospectionService: IShaderIntrospectionService;
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
  testContainer.bind<IDebugOrchestratorService>(TYPES.IDebugOrchestratorService).toConstantValue(mockDebugOrchestratorService);
  testContainer.bind<IShaderIntrospectionService>(TYPES.IShaderIntrospectionService).toConstantValue(mockShaderIntrospectionService);

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
