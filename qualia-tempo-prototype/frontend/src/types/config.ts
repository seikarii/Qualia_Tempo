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
import type { BackendSyncConfig } from '../services/contracts/IBackendSyncService.contracts';
import type { NotificationServiceConfig } from '../services/contracts/INotificationService.contracts';
import type { AudioServiceConfig } from '../services/contracts/IAudioService.contracts';
import type { QualiaCalculatorConfig } from '../services/contracts/IQualiaStateCalculatorService.contracts';
import type { GameControllerConfig } from '../services/contracts/IGameControllerService.contracts';
import type { DebugServiceConfig } from '../services/contracts/IDebugService.contracts';
import type { ErrorReportingConfig } from '../services/contracts/IErrorReportingService.contracts';
import type { EventBusConfig } from '../services/contracts/IEventBus.contracts';
import type { RhythmicMovementConfig } from '../services/contracts/IRhythmicMovementController.contracts';
import type { CompositionRootConfig, VisualEffectsConfig } from '../services/contracts/IApplicationCompositionRoot.contracts';

/**
 * Complete Game Configuration Interface
 * 
 * ARCHITECTURAL PRINCIPLE: This interface composes all service configurations
 * without ConfigurationService needing to know their internal structure.
 * Each service owns its configuration contract, ConfigurationService simply
 * provides type-safe access to the composed configuration.
 */
export interface FullGameConfig {
  compositionRoot: CompositionRootConfig;
  errorReporting: ErrorReportingConfig;
  audioService: AudioServiceConfig;
  qualiaCalculator: QualiaCalculatorConfig;
  backendSync: BackendSyncConfig;
  gameController: GameControllerConfig;
  debugService: DebugServiceConfig;
  notificationService: NotificationServiceConfig;
  rhythmicMovement: RhythmicMovementConfig;
  eventbus: EventBusConfig;
  visualEffects?: VisualEffectsConfig; // Optional visual effects config
}