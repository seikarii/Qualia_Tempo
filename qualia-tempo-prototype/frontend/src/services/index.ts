// QUALIA.CODE v1.1 - Services Barrel File
// Central export point for all services, interfaces, and InversifyJS container

// ===== INVERSIFYJS INFRASTRUCTURE =====
// Export the container for use in tests and special cases
export { container } from './inversify.container';

// Export the types for injection
export { TYPES } from './inversify.types';

// ===== SERVICE INTERFACES =====
// Core Services
export * from './interfaces/IEventBus';
export * from './interfaces/ILogger';
export * from './interfaces/IConfigurationService';

// Feature Services
export * from './interfaces/IQualiaStateCalculatorService';
export * from './interfaces/IBackendSyncService';
export * from './interfaces/IAudioService';
export * from './interfaces/IGameControllerService';
export * from './interfaces/IGameStateStoreService';
export * from './interfaces/INotificationService';
export * from './interfaces/IErrorReportingService';
export * from './interfaces/IDebugService';
export * from './interfaces/IRhythmicMovementController';

// ===== SERVICE IMPLEMENTATIONS =====
// Export implementations for cases where direct access is needed (tests, etc.)
export { EventBus } from './EventBus';
export { QualiaLogger } from './Logger';
export { ConfigurationService } from './ConfigurationService';
export { QualiaStateCalculatorService } from './QualiaStateCalculatorService';
export { BackendSyncService } from './BackendSyncService';
export { AudioService } from './AudioService';
export { GameControllerService } from './GameControllerService';
export { GameStateStoreService } from './GameStateStoreService';
export { NotificationService } from './NotificationService';
export { ErrorReportingService } from './ErrorReportingService';
export { DebugService } from './DebugService';
export { RhythmicMovementController } from './RhythmicMovementController';

// ===== HOOKS =====
// Export the new IoC-based hooks
export { useService } from './hooks';

// ===== TYPES =====
// Re-export important types from services
export type { 
  QualiaCalculatorConfig,
  BackendSyncConfig,
  AudioServiceConfig,
  ErrorReportingConfig,
  RhythmicMovementConfig,
  NotificationServiceConfig
} from './ConfigurationService';