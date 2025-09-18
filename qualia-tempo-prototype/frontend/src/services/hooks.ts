/**
 * QUALIA.CODE v1.1 - Service Hooks
 * React hooks for accessing services from InversifyJS IoC container.
 * 
 * CRITICAL: This replaces the manual CompositionRoot provider pattern.
 * All services are now resolved directly from the InversifyJS container.
 */

import { container } from './inversify.container';
import type { ServiceTypes } from './inversify.types';
import { TYPES } from './inversify.types';
import type { IEventBus } from './interfaces/IEventBus';
import type { ILogger } from './interfaces/ILogger';
import type { IConfigurationService } from './interfaces/IConfigurationService';
import type { IQualiaStateCalculatorService } from './interfaces/IQualiaStateCalculatorService';
import type { IBackendSyncService } from './interfaces/IBackendSyncService';
import type { IAudioService } from './interfaces/IAudioService';
import type { IGameControllerService } from './interfaces/IGameControllerService';
import type { IGameStateStoreService } from './interfaces/IGameStateStoreService';
import type { INotificationService } from './interfaces/INotificationService';
import type { IErrorReportingService } from './interfaces/IErrorReportingService';
import type { IDebugService } from './interfaces/IDebugService';
import type { IRhythmicMovementController } from './interfaces/IRhythmicMovementController';

/**
 * Generic hook for accessing any service from the IoC container.
 * This is the CORE hook that replaces the CompositionRoot provider.
 * 
 * @param serviceType The service identifier symbol
 * @returns The resolved service instance
 */
export const useService = <T>(serviceType: ServiceTypes): T => {
  try {
    return container.get<T>(serviceType);
  } catch (error) {
    throw new Error(`Service ${serviceType.toString()} not found in IoC container: ${error}`);
  }
};

// ===== CONVENIENCE HOOKS =====
// These provide type-safe access to specific services

/**
 * Hook for accessing EventBus service.
 */
export const useEventBus = (): IEventBus => 
  useService<IEventBus>(TYPES.IEventBus);

/**
 * Hook for accessing Logger service.
 */
export const useLogger = (): ILogger => 
  useService<ILogger>(TYPES.ILogger);

/**
 * Hook for accessing Configuration service.
 */
export const useConfiguration = (): IConfigurationService => 
  useService<IConfigurationService>(TYPES.IConfigurationService);

/**
 * Hook for accessing QualiaCalculator service.
 */
export const useQualiaCalculator = (): IQualiaStateCalculatorService => 
  useService<IQualiaStateCalculatorService>(TYPES.IQualiaStateCalculatorService);

/**
 * Hook for accessing BackendSync service.
 */
export const useBackendSync = (): IBackendSyncService => 
  useService<IBackendSyncService>(TYPES.IBackendSyncService);

/**
 * Hook for accessing Audio service.
 */
export const useAudioService = (): IAudioService => 
  useService<IAudioService>(TYPES.IAudioService);

/**
 * Hook for accessing GameController service.
 */
export const useGameController = (): IGameControllerService => 
  useService<IGameControllerService>(TYPES.IGameControllerService);

/**
 * Hook for accessing GameStateStore service.
 */
export const useGameStateStore = (): IGameStateStoreService => 
  useService<IGameStateStoreService>(TYPES.IGameStateStoreService);

/**
 * Hook for accessing Notification service.
 */
export const useNotificationService = (): INotificationService => 
  useService<INotificationService>(TYPES.INotificationService);

/**
 * Hook for accessing ErrorReporting service.
 */
export const useErrorReporting = (): IErrorReportingService => 
  useService<IErrorReportingService>(TYPES.IErrorReportingService);

/**
 * Hook for accessing Debug service.
 */
export const useDebugService = (): IDebugService => 
  useService<IDebugService>(TYPES.IDebugService);

/**
 * Hook for accessing RhythmicMovement controller.
 */
export const useRhythmicMovementController = (): IRhythmicMovementController => 
  useService<IRhythmicMovementController>(TYPES.IRhythmicMovementController);
