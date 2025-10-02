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
import type { IPerformanceService } from './interfaces/IPerformanceService';
// QUALIA.CODE v1.1: Service imports removed - event-driven pattern eliminates coupling
// import type { INotificationService } from './interfaces/INotificationService';
// import type { IErrorReportingService } from './interfaces/IErrorReportingService';
import { logMethod, catchError, BrowserOnly, OnEvent, initializeEventSubscriptions, cleanupEventSubscriptions } from '../utils/decorators';
import type { ConfigurationLoadedEvent, ServiceStatusUpdateEvent } from './contracts/events.contracts';
import type { IBaseService } from './interfaces/IBaseService';

@injectable()
export class DebugOrchestratorService implements IDebugOrchestratorService, IBaseService {
  private readonly config: DebugOrchestratorConfig;
  private readonly logger: ILogger;
  private readonly timerService: ITimerService;
  private readonly performanceService: IPerformanceService;
  // QUALIA.CODE v1.1: Services no longer directly injected - event-driven pattern
  // private readonly notificationService: INotificationService;
  // private readonly errorReportingService: IErrorReportingService;
  
  private lastUpdateTime: Date;
  // @ts-expect-error - Reserved for diagnostic caching functionality
  private _cachedDiagnostics: ServiceDiagnosticData | null = null;

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
  ) {
    this.config = params.config;
    this.logger = params.logger;
    this.timerService = params.timerService;
    this.performanceService = params.performanceService;
    // QUALIA.CODE v1.1: Services no longer injected - event-driven pattern eliminates coupling
    
    this.lastUpdateTime = this.timerService.getCurrentDate();
    this.logger.info('DebugOrchestratorService initialized (event-driven mode)', {
      refreshInterval: this.config.refreshInterval,
      enablePerformanceTracking: this.config.enablePerformanceTracking,
      pattern: 'push (event-driven)',
      note: 'Services will emit ServiceStatusUpdateEvent for passive aggregation'
    });
  }

  @logMethod
  @catchError
  @BrowserOnly
  async gatherServiceDiagnostics(): Promise<ServiceDiagnosticData> {
    const serviceStatuses = await this.getServiceStatuses();
    
    // Get system information
    const systemInfo = {
      timestamp: this.timerService.getCurrentDate(),
      performance: {
        memoryUsage: this.getMemoryUsage(),
        fpsAverage: this.getFpsAverage(),
        renderTime: this.getRenderTime()
      },
      configuration: {
        debugMode: this.isDebugModeEnabled(),
        // QUALIA.CODE v1.1: Use injected config instead of process.env (Platform Abstraction)
        environment: this.config.environment,
        version: this.config.version
      }
    };

    const diagnosticData: ServiceDiagnosticData = {
      services: serviceStatuses,
      systemInfo
    };

    this._cachedDiagnostics = diagnosticData;
    this.lastUpdateTime = this.timerService.getCurrentDate();
    
    return diagnosticData;
  }

  /**
   * QUALIA.CODE v1.1: Event-Driven Service Status Retrieval
   * 
   * ARCHITECTURE PATTERN: Passive Aggregation (Push Model)
   * 
   * This method NO LONGER calls other services directly. Instead, it simply
   * returns the aggregated status information that has been collected via
   * ServiceStatusUpdateEvent events.
   * 
   * BENEFITS:
   * - Zero coupling to other services
   * - No knowledge of other services' internal methods
   * - Highly scalable - services emit on their own schedule
   * - Event-driven architecture compliance
   * 
   * NOTE: If a service hasn't emitted a status update yet, it won't appear
   * in this list. This is by design - services are responsible for their
   * own status broadcasting.
   */
  @logMethod
  @catchError
  async getServiceStatuses(): Promise<ServiceStatus[]> {
    // QUALIA.CODE v1.1: Simply convert the internal map to an array
    // No direct service method calls - pure event-driven aggregation
    const statuses: ServiceStatus[] = Array.from(this.serviceStatuses.values());
    
    this.logger.debug('Retrieved service statuses from event aggregation', {
      totalServices: statuses.length,
      pattern: 'event-driven (push)',
      services: statuses.map(s => s.name)
    });

    return statuses;
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
    this.logger.info('Forcing diagnostic data refresh');
    this._cachedDiagnostics = null;
    await this.gatherServiceDiagnostics();
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

  // Private helper methods
  private getMemoryUsage(): number {
    // QUALIA.CODE v1.1: Use abstracted IPerformanceService instead of direct platform API
    const memoryInfo = this.performanceService.getMemoryInfo();
    if (memoryInfo.usedJSHeapSize) {
      return memoryInfo.usedJSHeapSize / this.config.defaultMetrics.memoryConversionFactor; // MB
    }
    return 0;
  }

  private getFpsAverage(): number {
    // This would need to be integrated with a performance monitoring system
    // For now, return a default value
    return this.config.defaultMetrics.fps;
  }

  private getRenderTime(): number {
    // This would need to be integrated with the rendering system
    // For now, return a default value
    return this.config.defaultMetrics.frameTime; // ~60fps
  }

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
