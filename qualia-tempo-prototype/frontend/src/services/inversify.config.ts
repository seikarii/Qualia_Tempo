/**
 * QUALIA.CODE v1.1 - InversifyJS Configuration
 * Service binding configuration for the IoC container.
 * 
 * CRITICAL MANDATE: This file replaces the manual CompositionRoot.
 * All service instantiation happens here through container bindings.
 */

import { container } from './inversify.container';
import { TYPES } from './inversify.types';

// ===== IMPORT ALL INTERFACES =====
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
import type { IOntologicalAudioEngine } from '../audio/IOntologicalAudioEngine';
import type { IApplicationInitializerService } from './interfaces/IApplicationInitializerService';

// ===== IMPORT ALL IMPLEMENTATIONS =====
import { EventBus } from './EventBus';
import { QualiaLogger } from './Logger';
import { ConfigurationService } from './ConfigurationService';
import { QualiaStateCalculatorService } from './QualiaStateCalculatorService';
import { BackendSyncService } from './BackendSyncService';
import { AudioService } from './AudioService';
import { GameControllerService } from './GameControllerService';
import { GameStateStoreService } from './GameStateStoreService';
import { NotificationService } from './NotificationService';
import { ErrorReportingService } from './ErrorReportingService';
import { DebugService } from './DebugService';
import { RhythmicMovementController } from './RhythmicMovementController';
import { OntologicalAudioEngine } from '../audio/OntologicalAudioEngine';
import { ApplicationInitializerService } from './ApplicationInitializerService';

// ===== IMPORT ZUSTAND STORE =====
import { useGameStore } from '../state/useGameStore';

// ===== CORE SERVICE BINDINGS =====
// These services have no dependencies and can be bound directly
container.bind<IEventBus>(TYPES.IEventBus).to(EventBus).inSingletonScope();
container.bind<ILogger>(TYPES.ILogger).to(QualiaLogger).inSingletonScope();
container.bind<IConfigurationService>(TYPES.IConfigurationService).to(ConfigurationService).inSingletonScope();

// ===== SPECIAL BINDINGS =====
// Bind Zustand store setter for GameStateStoreService
container.bind(TYPES.StoreSetter).toConstantValue(useGameStore.setState);

// ===== FEATURE SERVICE BINDINGS =====
// These services depend on core services and will be injected automatically
container.bind<IQualiaStateCalculatorService>(TYPES.IQualiaStateCalculatorService).to(QualiaStateCalculatorService).inSingletonScope();
container.bind<IBackendSyncService>(TYPES.IBackendSyncService).to(BackendSyncService).inSingletonScope();
container.bind<IAudioService>(TYPES.IAudioService).to(AudioService).inSingletonScope();
container.bind<IGameControllerService>(TYPES.IGameControllerService).to(GameControllerService).inSingletonScope();
container.bind<IGameStateStoreService>(TYPES.IGameStateStoreService).to(GameStateStoreService).inSingletonScope();
container.bind<INotificationService>(TYPES.INotificationService).to(NotificationService).inSingletonScope();
container.bind<IErrorReportingService>(TYPES.IErrorReportingService).to(ErrorReportingService).inSingletonScope();
container.bind<IDebugService>(TYPES.IDebugService).to(DebugService).inSingletonScope();
container.bind<IRhythmicMovementController>(TYPES.IRhythmicMovementController).to(RhythmicMovementController).inSingletonScope();
container.bind<IOntologicalAudioEngine>(TYPES.IOntologicalAudioEngine).to(OntologicalAudioEngine).inSingletonScope();
container.bind<IApplicationInitializerService>(TYPES.IApplicationInitializerService).to(ApplicationInitializerService).inSingletonScope();

// ===== CONTAINER VERIFICATION =====
// Container is configured and ready

export { container };