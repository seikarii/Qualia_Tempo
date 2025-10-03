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
import type { IColorService } from "../services/interfaces/IColorService";
// DIRECTIVE 003: New interface imports for comprehensive mock coverage
import type { IApplicationInitializerService } from "../services/interfaces/IApplicationInitializerService";
import type { INotificationService } from "../services/interfaces/INotificationService";
import type { IViewLogicService } from "../services/interfaces/IViewLogicService";
import type { IStateStreamingService } from "../services/interfaces/IStateStreamingService";
import type { IGameplayMechanicsService } from "../services/interfaces/IGameplayMechanicsService";
import type { IAudioService } from "../services/interfaces/IAudioService";
import type { IGameControllerService } from "../services/interfaces/IGameControllerService";
import type { IQualiaStateCalculatorService } from "../services/interfaces/IQualiaStateCalculatorService";
import type { IErrorReportingService } from "../services/interfaces/IErrorReportingService";
import type { IDebugService } from "../services/interfaces/IDebugService";
import type { ISubtitleService } from "../services/interfaces/ISubtitleService";
import type { IRhythmicMovementController } from "../services/interfaces/IRhythmicMovementController";
import type { IBackendSyncService } from "../services/interfaces/IBackendSyncService";

// Import real services for pure utilities (no side effects)
import { ColorService } from "../services/ColorService";

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
// DIRECTIVE 003: New mock imports for comprehensive coverage
import { mockApplicationInitializerService } from "./mocks/application-initializer-service.mock";
import { mockNotificationService } from "./mocks/notification-service.mock";
import { mockViewLogicService } from "./mocks/view-logic-service.mock";
import { mockStateStreamingService } from "./mocks/state-streaming-service.mock";
import { mockGameplayMechanicsService } from "./mocks/gameplay-mechanics-service.mock";
import { mockAudioService } from "./mocks/audio-service.mock";
import { mockGameControllerService } from "./mocks/game-controller-service.mock";
import { mockQualiaStateCalculatorService } from "./mocks/qualia-state-calculator-service.mock";
import { mockErrorReportingService } from "./mocks/error-reporting-service.mock";
import { mockDebugService } from "./mocks/debug-service.mock";
import { mockSubtitleService } from "./mocks/subtitle-service.mock";
import { mockRhythmicMovementController } from "./mocks/rhythmic-movement-controller.mock";
import { mockBackendSyncService } from "./mocks/backend-sync-service.mock";

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
  // DIRECTIVE 003: New mock services
  mockApplicationInitializerService: IApplicationInitializerService;
  mockNotificationService: INotificationService;
  mockViewLogicService: IViewLogicService;
  mockStateStreamingService: IStateStreamingService;
  mockGameplayMechanicsService: IGameplayMechanicsService;
  mockAudioService: IAudioService;
  mockGameControllerService: IGameControllerService;
  mockQualiaStateCalculatorService: IQualiaStateCalculatorService;
  mockErrorReportingService: IErrorReportingService;
  mockDebugService: IDebugService;
  mockSubtitleService: ISubtitleService;
  mockRhythmicMovementController: IRhythmicMovementController;
  mockBackendSyncService: IBackendSyncService;
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
  
  // DIRECTIVE 003: Bind all newly created high-fidelity mocks
  testContainer.bind<IApplicationInitializerService>(TYPES.IApplicationInitializerService).toConstantValue(mockApplicationInitializerService);
  testContainer.bind<INotificationService>(TYPES.INotificationService).toConstantValue(mockNotificationService);
  testContainer.bind<IViewLogicService>(TYPES.IViewLogicService).toConstantValue(mockViewLogicService);
  testContainer.bind<IStateStreamingService>(TYPES.IStateStreamingService).toConstantValue(mockStateStreamingService);
  testContainer.bind<IGameplayMechanicsService>(TYPES.IGameplayMechanicsService).toConstantValue(mockGameplayMechanicsService);
  testContainer.bind<IAudioService>(TYPES.IAudioService).toConstantValue(mockAudioService);
  testContainer.bind<IGameControllerService>(TYPES.IGameControllerService).toConstantValue(mockGameControllerService);
  testContainer.bind<IQualiaStateCalculatorService>(TYPES.IQualiaStateCalculatorService).toConstantValue(mockQualiaStateCalculatorService);
  testContainer.bind<IErrorReportingService>(TYPES.IErrorReportingService).toConstantValue(mockErrorReportingService);
  testContainer.bind<IDebugService>(TYPES.IDebugService).toConstantValue(mockDebugService);
  testContainer.bind<ISubtitleService>(TYPES.ISubtitleService).toConstantValue(mockSubtitleService);
  testContainer.bind<IRhythmicMovementController>(TYPES.IRhythmicMovementController).toConstantValue(mockRhythmicMovementController);
  testContainer.bind<IBackendSyncService>(TYPES.IBackendSyncService).toConstantValue(mockBackendSyncService);

  // STEP 2.5: Bind real services for pure utilities (no side effects, no external dependencies)
  // ColorService is a pure utility that only performs mathematical color conversions
  testContainer.bind<IColorService>(TYPES.IColorService).to(ColorService).inSingletonScope();

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
