/**
 * QUALIA.CODE v1.1 - DebugOrchestratorService
 * Service responsible for orchestrating service diagnostics collection.
 * Extracts complex diagnostic logic from ServiceDiagnosticsPanel component.
 */

import { injectable, inject } from 'inversify';
import { TYPES } from './inversify.types';
import type { IDebugOrchestratorService } from './interfaces/IDebugOrchestratorService';
import type { 
  ServiceDiagnosticData, 
  ServiceStatus, 
  DebugOrchestratorConfig,
  DebugOrchestratorServiceParams
} from './contracts/IDebugOrchestratorService.contracts';
import type { ILogger } from './interfaces/ILogger';
import type { ITimerService } from './interfaces/ITimerService';
import type { IEventBus } from './interfaces/IEventBus';
// QUALIA.CODE v1.1: Service imports removed - event-driven pattern eliminates coupling
// import type { INotificationService } from './interfaces/INotificationService';
// import type { IErrorReportingService } from './interfaces/IErrorReportingService';
import { logMethod, catchError, OnEvent, initializeEventSubscriptions, cleanupEventSubscriptions } from '../utils/decorators';
import type { ConfigurationLoadedEvent, ServiceStatusUpdateEvent } from './contracts/events.contracts';
import type { IBaseService } from './interfaces/IBaseService';

@injectable()
export class DebugOrchestratorService implements IDebugOrchestratorService, IBaseService {
  private readonly config: DebugOrchestratorConfig;
  private readonly logger: ILogger;
  private readonly timerService: ITimerService;
  // QUALIA.CODE v1.1: EventBus required for @OnEvent decorator lifecycle management
  // @ts-expect-error - Used by @OnEvent decorator infrastructure
  private readonly eventBus: IEventBus;
  // QUALIA.CODE v1.1: Services no longer directly injected - event-driven pattern
  // private readonly notificationService: INotificationService;
  // private readonly errorReportingService: IErrorReportingService;
  
  private lastUpdateTime: Date;
  // @ts-expect-error - Reserved for diagnostic caching functionality
  private _cachedDiagnostics: ServiceDiagnosticData | null = null;
  // @ts-expect-error - Reserved for @OnEvent decorator lifecycle management
  private _eventListeners: string[] = [];

  /**
   * QUALIA.CODE v1.1: Event-Driven Service Status Aggregation
   * 
   * This map serves as the passive storage for service statuses.
   * It is populated by incoming ServiceStatusUpdateEvents, implementing
   * the "push" pattern instead of the "pull" pattern.
   * 
   * ARCHITECTURE: This eliminates service coupling - DebugOrchestratorService
   * no longer calls methods on other services. It simply aggregates events.
   */
  private serviceStatuses: Map<string, ServiceStatus> = new Map();

  constructor(
    @inject(TYPES.DebugOrchestratorServiceParams) params: DebugOrchestratorServiceParams,
    @inject(TYPES.IEventBus) eventBus: IEventBus,
  ) {
    this.config = params.config;
    this.logger = params.logger;
    this.timerService = params.timerService;
    this.eventBus = eventBus;
    // QUALIA.CODE v1.1: Services no longer injected - event-driven pattern eliminates coupling
    
    this.lastUpdateTime = this.timerService.getCurrentDate();
    this.logger.info('DebugOrchestratorService initialized (event-driven mode)', {
      refreshInterval: this.config.refreshInterval,
      enablePerformanceTracking: this.config.enablePerformanceTracking,
      pattern: 'push (event-driven)',
      note: 'Services will emit ServiceStatusUpdateEvent for passive aggregation'
    });
  }

  /**
   * QUALIA.CODE v1.1: Real-Time Health Report (Event-Driven)
   * 
   * Returns the current cached state of all service statuses.
   * This method is SYNCHRONOUS and ultra-fast because it simply reads
   * from the internal Map that is populated by incoming events.
   * 
   * ARCHITECTURE: Pure "push" pattern - no service calls, no async operations.
   * @returns Array of current service statuses
   */
  @logMethod
  public getHealthReport(): ServiceStatus[] {
    // Simply return the current state of the Map. Ultra-fast and synchronous.
    const report = Array.from(this.serviceStatuses.values());
    
    this.logger.debug('Health report retrieved from cache', {
      totalServices: report.length,
      pattern: 'event-driven (push)',
      services: report.map(s => s.name)
    });

    return report;
  }





  /**
   * QUALIA.CODE v1.1: Event Handler for Service Status Updates
   * 
   * ARCHITECTURE PATTERN: Passive Aggregator
   * 
   * This handler is automatically invoked by the @OnEvent decorator whenever
   * ANY service in the system emits a ServiceStatusUpdateEvent. The service
   * passively collects and stores this information in its internal map.
   * 
   * DECOUPLING: DebugOrchestratorService has ZERO knowledge of:
   * - Which services exist
   * - What methods they have
   * - When they update their status
   * 
   * Services are responsible for emitting their own status updates.
   * This service is merely a "bulletin board" for status information.
   */
  @OnEvent('ServiceStatusUpdate')
  // @ts-expect-error - Method used by @OnEvent decorator but TypeScript cannot detect it
  private handleServiceStatusUpdate(event: ServiceStatusUpdateEvent): void {
    const { serviceName, status } = event;
    
    // Convert event data to ServiceStatus format
    const serviceStatus: ServiceStatus = {
      name: serviceName,
      isRunning: status.isRunning,
      status: status.isRunning ? 'RUNNING' : 'STOPPED',
      stats: status.stats,
      error: status.error,
      lastUpdate: event.timestamp
    };

    // Update the internal map with the latest status
    this.serviceStatuses.set(serviceName, serviceStatus);
    
    this.logger.debug('Service status updated via event', {
      serviceName,
      isRunning: status.isRunning,
      hasStats: !!status.stats,
      hasError: !!status.error,
      pattern: 'event-driven (push)'
    });
  }

  @logMethod
  isDebugModeEnabled(): boolean {
    // QUALIA.CODE v1.1: Use injected config instead of process.env
    return this.config.environment === 'development';
  }

  @logMethod
  getLastUpdateTime(): Date {
    return this.lastUpdateTime;
  }

  @logMethod
  @catchError
  async forceRefresh(): Promise<void> {
    this.logger.info('Force refresh requested (event-driven model - no action needed)', {
      pattern: 'event-driven (push)',
      note: 'Service status is passively aggregated via events. No manual refresh required.'
    });
    this._cachedDiagnostics = null;
    this.lastUpdateTime = this.timerService.getCurrentDate();
  }

  /**
   * QUALIA.CODE v1.1: Configuration Loaded Event Handler
   * 
   * When configuration is loaded, we treat ConfigurationService as another
   * service and add its status to our internal map via the same event-driven
   * pattern. This maintains consistency - ALL service status is event-driven.
   */
  @OnEvent('ConfigurationLoaded')
  // @ts-expect-error - Method used by @OnEvent decorator but TypeScript cannot detect it
  private onConfigurationLoaded(event: ConfigurationLoadedEvent): void {
    // Treat ConfigurationService status as an event-driven update
    const configServiceStatus: ServiceStatus = {
      name: 'ConfigurationService',
      isRunning: true,
      status: `LOADED | Configs: ${event.totalConfigs}`,
      stats: {
        configLoaded: true,
        loadedConfigs: event.loadedConfigs,
        totalConfigs: event.totalConfigs
      },
      lastUpdate: event.timestamp
    };

    this.serviceStatuses.set('ConfigurationService', configServiceStatus);
    
    this.logger.info('Configuration loaded and status updated', { 
      loadedConfigs: event.loadedConfigs,
      pattern: 'event-driven'
    });
  }

  // Private helper methods removed - no longer needed with event-driven model

  // IBaseService implementation
  public initialize(): void {
    // Activa todas las suscripciones de eventos declaradas con @OnEvent
    initializeEventSubscriptions(this);
    this.logger.info('DebugOrchestratorService initialized and event subscriptions active');
  }

  @logMethod
  public cleanup(): void {
    // Limpia todas las suscripciones de eventos para prevenir memory leaks
    cleanupEventSubscriptions(this);
    this.logger.info('DebugOrchestratorService cleanup completed');
  }
}
