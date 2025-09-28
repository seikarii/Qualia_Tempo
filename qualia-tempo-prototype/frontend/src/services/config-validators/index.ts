/**
 * QUALIA.CODE v1.1 - Configuration Validators Index
 * Centralized export for all modular configuration validators.
 * 
 * ARCHITECTURAL ADVANTAGE: This index file provides a single import point
 * for all validation functions, making them easy to use and maintain.
 */

// Import individual validators
import { validateCompositionRootConfig } from './validateCompositionRoot.validator';
import { validateErrorReportingConfig } from './validateErrorReporting.validator';
import { validateAudioServiceConfig } from './validateAudioService.validator';
import { validateQualiaCalculatorConfig } from './validateQualiaCalculator.validator';
import { validateBackendSyncConfig } from './validateBackendSync.validator';
import { validateGameControllerConfig } from './validateGameController.validator';
import { validateDebugServiceConfig } from './validateDebugService.validator';
import { validateNotificationServiceConfig } from './validateNotificationService.validator';
import { validateRhythmicMovementConfig } from './validateRhythmicMovement.validator';
import { validateEventBusConfig } from './validateEventBus.validator';

// Export all individual validators
export {
  validateCompositionRootConfig,
  validateErrorReportingConfig,
  validateAudioServiceConfig,
  validateQualiaCalculatorConfig,
  validateBackendSyncConfig,
  validateGameControllerConfig,
  validateDebugServiceConfig,
  validateNotificationServiceConfig,
  validateRhythmicMovementConfig,
  validateEventBusConfig
};

// Import the full config type for composite validation
import type { FullGameConfig } from '../../types/config';

/**
 * Orchestrator function that validates the complete configuration
 * by calling all individual validators.
 * 
 * USAGE: This replaces the monolithic validateConfig method in ConfigurationService.
 * ConfigurationService now simply calls this orchestrator function.
 * 
 * @param config - Complete game configuration to validate
 * @throws Error if any configuration section is invalid
 */
export function validateFullGameConfig(config: FullGameConfig): void {
  validateCompositionRootConfig(config.compositionRoot);
  validateErrorReportingConfig(config.errorReporting);
  validateAudioServiceConfig(config.audioService);
  validateQualiaCalculatorConfig(config.qualiaCalculator);
  validateBackendSyncConfig(config.backendSync);
  validateGameControllerConfig(config.gameController);
  validateDebugServiceConfig(config.debugService);
  validateNotificationServiceConfig(config.notificationService);
  validateRhythmicMovementConfig(config.rhythmicMovement);
  validateEventBusConfig(config.eventBus);
  
  // Visual effects config is optional, only validate if present
  // Individual services handle their optional config validation internally
}