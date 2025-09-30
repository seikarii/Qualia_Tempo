/**
 * QUALIA.CODE v1.1 - Service Hooks for React Components  
 * Provides IoC container integration through React hooks
 * Components should NEVER import TYPES directly - use these hooks instead
 */

import { useRef } from 'react';
import { useContainer } from './ServiceContext';
import { TYPES } from './inversify.types';
import type { IEventBus } from './interfaces/IEventBus';
import type { ILogger } from './interfaces/ILogger';
import type { IConfigurationService } from './interfaces/IConfigurationService';
import type { IQualiaStateCalculatorService } from './interfaces/IQualiaStateCalculatorService';
import type { IBackendSyncService } from './interfaces/IBackendSyncService';
import type { IAudioService } from './interfaces/IAudioService';
import type { IGameControllerService } from './interfaces/IGameControllerService';
import type { IGameInputControllerService } from './interfaces/IGameInputControllerService';
import type { IGameStateStoreService } from './interfaces/IGameStateStoreService';
import type { INotificationService } from './interfaces/INotificationService';
import type { IErrorReportingService } from './interfaces/IErrorReportingService';
import type { IDebugService } from './interfaces/IDebugService';
import type { IRhythmicMovementController } from './interfaces/IRhythmicMovementController';
import type { IFrontendRenderingService } from './interfaces/IFrontendRenderingService';
import type { IStateStreamingService } from './interfaces/IStateStreamingService';
import type { IHttpService } from './interfaces/IHttpService';
import type { ITimerService } from './interfaces/ITimerService';
import type { IWebSocketService } from './interfaces/IWebSocketService';
import type { IBrowserEventsService } from './interfaces/IBrowserEventsService';
import type { IInputStateService } from './interfaces/IInputStateService';
import type { ICoordinateSystemService } from './interfaces/ICoordinateSystemService';

// NEW SERVICES INTERFACES
import type { IGameplayMechanicsService } from './interfaces/IGameplayMechanicsService';
import type { IViewLogicService } from './interfaces/IViewLogicService';
import type { ISubtitleService } from './interfaces/ISubtitleService';
import type { IDebugOrchestratorService } from './interfaces/IDebugOrchestratorService';

/**
 * Generic hook to resolve a service from the IoC container
 * @param serviceIdentifier - Symbol identifier for the service
 * @returns The resolved service instance
 */
export function useService<T>(serviceIdentifier: symbol): T {
  const container = useContainer();
  const serviceRef = useRef<T | null>(null);
  
  if (serviceRef.current === null) {
    if (!container.isBound(serviceIdentifier)) {
      throw new Error(`Service ${serviceIdentifier.toString()} is not bound in the IoC container. Make sure configureServices() has been called.`);
    }
    serviceRef.current = container.get<T>(serviceIdentifier);
  }
  
  return serviceRef.current as T;
}

/**
 * TYPED SERVICE HOOKS
 * Components should use these instead of importing TYPES directly
 * Each hook encapsulates both the service type and its TYPES identifier
 */

// Core Services
export const useEventBus = (): IEventBus => 
  useService<IEventBus>(TYPES.IEventBus);

export const useLogger = (): ILogger => 
  useService<ILogger>(TYPES.ILogger);

export const useConfigurationService = (): IConfigurationService => 
  useService<IConfigurationService>(TYPES.IConfigurationService);

// Game Services  
export const useGameControllerService = (): IGameControllerService => 
  useService<IGameControllerService>(TYPES.IGameControllerService);

export const useGameInputControllerService = (): IGameInputControllerService => 
  useService<IGameInputControllerService>(TYPES.IGameInputControllerService);

export const useGameStateStoreService = (): IGameStateStoreService => 
  useService<IGameStateStoreService>(TYPES.IGameStateStoreService);

export const useQualiaStateCalculatorService = (): IQualiaStateCalculatorService => 
  useService<IQualiaStateCalculatorService>(TYPES.IQualiaStateCalculatorService);

// Media Services
export const useAudioService = (): IAudioService => 
  useService<IAudioService>(TYPES.IAudioService);

export const useFrontendRenderingService = (): IFrontendRenderingService => 
  useService<IFrontendRenderingService>(TYPES.IFrontendRenderingService);

export const useStateStreamingService = (): IStateStreamingService => 
  useService<IStateStreamingService>(TYPES.IStateStreamingService);

// Communication Services
export const useBackendSyncService = (): IBackendSyncService => 
  useService<IBackendSyncService>(TYPES.IBackendSyncService);

export const useHttpService = (): IHttpService => 
  useService<IHttpService>(TYPES.IHttpService);

export const useNotificationService = (): INotificationService => 
  useService<INotificationService>(TYPES.INotificationService);

// Development Services
export const useDebugService = (): IDebugService => 
  useService<IDebugService>(TYPES.IDebugService);

export const useErrorReportingService = (): IErrorReportingService => 
  useService<IErrorReportingService>(TYPES.IErrorReportingService);

// Configuration Service (convenience alias)
export const useConfiguration = (): IConfigurationService => 
  useService<IConfigurationService>(TYPES.IConfigurationService);

// Aliases for convenience
export const useErrorReporting = useErrorReportingService;

// Utility Services
export const useTimerService = (): ITimerService => 
  useService<ITimerService>(TYPES.ITimerService);

export const useWebSocketService = (): IWebSocketService => 
  useService<IWebSocketService>(TYPES.IWebSocketService);

export const useBrowserEventsService = (): IBrowserEventsService => 
  useService<IBrowserEventsService>(TYPES.IBrowserEventsService);

export const useRhythmicMovementController = (): IRhythmicMovementController => 
  useService<IRhythmicMovementController>(TYPES.IRhythmicMovementController);

export const useInputStateService = () => 
  useService<IInputStateService>(TYPES.IInputStateService);

export const useCoordinateSystemService = (): ICoordinateSystemService => 
  useService<ICoordinateSystemService>(TYPES.ICoordinateSystemService);

// NEW SERVICES HOOKS
export const useGameplayMechanicsService = (): IGameplayMechanicsService => 
  useService<IGameplayMechanicsService>(TYPES.IGameplayMechanicsService);

export const useViewLogicService = (): IViewLogicService => 
  useService<IViewLogicService>(TYPES.IViewLogicService);

export const useSubtitleService = (): ISubtitleService => 
  useService<ISubtitleService>(TYPES.ISubtitleService);

export const useDebugOrchestratorService = (): IDebugOrchestratorService => 
  useService<IDebugOrchestratorService>(TYPES.IDebugOrchestratorService);
