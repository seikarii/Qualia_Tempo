/**
 * QUALIA.CODE v1.1 - Centralized Configuration Composition
 * Single Source of Truth for complete application configuration.
 *
 * Architecture: This file imports all service-specific configuration contracts
 * and composes them into a unified FullGameConfig interface.
 *
 * MISSION: Eliminate ConfigurationService god object anti-pattern by
 * decoupling configuration contracts from the configuration provider.
 */

// Import all service-specific configuration contracts
import type { AppInitializerConfig } from '../services/contracts/IApplicationInitializerService.contracts';
import type { AudioServiceConfig } from '../services/contracts/IAudioService.contracts';
import type { BackendSyncConfig } from '../services/contracts/IBackendSyncService.contracts';
import type { CompositionRootConfig, VisualEffectsConfig } from '../services/contracts/IApplicationCompositionRoot.contracts';
import type { DebugServiceConfig } from '../services/contracts/IDebugService.contracts';
import type { ErrorReportingConfig } from '../services/contracts/IErrorReportingService.contracts';
import type { EventBusConfig } from '../services/contracts/IEventBus.contracts';
import type { GameControllerConfig } from '../services/contracts/IGameControllerService.contracts';
import type { HttpConfig } from '../services/contracts/IHttpService.contracts';
import type { LoggerConfig } from '../services/contracts/ILogger.contracts';
import type { NotificationServiceConfig } from '../services/contracts/INotificationService.contracts';
import type { QualiaCalculatorConfig } from '../services/contracts/IQualiaStateCalculatorService.contracts';
import type { RhythmicMovementConfig } from '../services/contracts/IRhythmicMovementController.contracts';
import type { FrontendRenderingConfig } from '../services/contracts/IFrontendRenderingService.contracts';

// QUALIA.CODE v1.1: New service configuration contracts
import type { GameplayMechanicsConfig } from '../services/contracts/IGameplayMechanicsService.contracts';
import type { ViewLogicConfig } from '../services/contracts/IViewLogicService.contracts';
import type { SubtitleConfig } from '../services/contracts/ISubtitleService.contracts';
import type { DebugOrchestratorConfig } from '../services/contracts/IDebugOrchestratorService.contracts';
import type { GameStateStoreConfig } from '../services/contracts/IGameStateStoreService.contracts';
import type { PostProcessingConfig } from '../services/contracts/IPostProcessingService.contracts';
import type { ProtocolAdapterConfig } from '../services/contracts/IProtocolAdapter.contracts';
import type { TimerServiceConfig } from '../services/contracts/ITimerService.contracts';
import type { AudioSessionConfig } from '../services/contracts/IAudioSystemBridge.contracts';

/**
 * Gameplay Configuration Interface
 * Defines timing windows and gameplay parameters
 */
export interface GameplayConfig {
  timingWindows: {
    perfect: number; // milliseconds - perfect hit window
    good: number; // milliseconds - good hit window
  };
  rhythmTolerance: number; // milliseconds - window for rhythm accuracy
  comboResetTime: number; // seconds - time before combo resets
  pauseCooldown: number; // seconds - cooldown for Pause ability
}

/**
 * Complete Game Configuration Interface
 *
 * ARCHITECTURAL PRINCIPLE: This interface composes all service configurations
 * without ConfigurationService needing to know their internal structure.
 * Each service owns its configuration contract; ConfigurationService simply
 * provides type-safe access to the composed configuration.
 *
 * THIS IS THE SINGLE SOURCE OF TRUTH.
 */
export interface FullGameConfig {
  // Core Application & Composition
  compositionRoot: CompositionRootConfig;
  applicationInitializer: AppInitializerConfig;

  // System & Core Services
  logger: LoggerConfig;
  http: HttpConfig;
  eventBus: EventBusConfig;
  backendSync: BackendSyncConfig;
  timerService: TimerServiceConfig;

  // Game Logic Services
  gameController: GameControllerConfig;
  gameplay: GameplayConfig;
  qualiaCalculator: QualiaCalculatorConfig;
  rhythmicMovement: RhythmicMovementConfig;

  // Transversal Services
  audioService: AudioServiceConfig;
  audioSession: AudioSessionConfig;
  frontendRendering: FrontendRenderingConfig;
  notificationService: NotificationServiceConfig;
  errorReporting: ErrorReportingConfig;
  debugService: DebugServiceConfig;

  // QUALIA.CODE v1.1: New Service Configurations
  gameplayMechanics: GameplayMechanicsConfig;
  viewLogic: ViewLogicConfig;
  subtitle: SubtitleConfig;
  debugOrchestrator: DebugOrchestratorConfig;
  gameStateStore: GameStateStoreConfig;
  postProcessing: PostProcessingConfig;
  protocolAdapter: ProtocolAdapterConfig;

  // QUALIA.CODE v2.0: Audio Analysis and Physics Services
  audioAnalysis: import('../services/contracts/IAudioAnalysisService.contracts').AudioAnalysisServiceConfig;
  physics: import('../services/contracts/IPhysicsService.contracts').PhysicsServiceConfig;

  // PHASE 4: Temporal Effects & Post-Processing Passes
  jitterService: import('../services/contracts/IJitterService.contracts').JitterServiceConfig;
  bloomPass: import('../services/contracts/IBloomPass.contracts').BloomPassConfig;
  taaPass: import('../services/contracts/ITAAPass.contracts').TAAPassConfig;
  motionBlurPass: import('../services/contracts/IMotionBlurPass.contracts').MotionBlurPassConfig;
  dofPass: import('../services/contracts/IDoFPass.contracts').DoFPassConfig;

  // Optional Features
  visualEffects?: VisualEffectsConfig;
}