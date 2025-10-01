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
import type { INotificationService } from './interfaces/INotificationService';
import type { IErrorReportingService } from './interfaces/IErrorReportingService';
import { logMethod, catchError, OnEvent } from '../utils/decorators';
import type { ConfigurationLoadedEvent } from './contracts/events.contracts';
import type { IBaseService } from './interfaces/IBaseService';

@injectable()
export class DebugOrchestratorService implements IDebugOrchestratorService, IBaseService {
  private readonly config: DebugOrchestratorConfig;
  private readonly logger: ILogger;
  private readonly timerService: ITimerService;
  private readonly notificationService: INotificationService;
  private readonly errorReportingService: IErrorReportingService;
  
  private lastUpdateTime: Date;
  // @ts-expect-error - Reserved for diagnostic caching functionality
  private _cachedDiagnostics: ServiceDiagnosticData | null = null;
  private configLoaded: boolean = false;

  constructor(
    @inject(TYPES.DebugOrchestratorServiceParams) params: DebugOrchestratorServiceParams,
  ) {
    this.config = params.config;
    this.logger = params.logger;
    this.timerService = params.timerService;
    this.notificationService = params.notificationService;
    this.errorReportingService = params.errorReportingService;
    
    this.lastUpdateTime = this.timerService.getCurrentDate();
    this.logger.info('DebugOrchestratorService initialized', {
      refreshInterval: this.config.refreshInterval,
      enablePerformanceTracking: this.config.enablePerformanceTracking
    });
  }

  @logMethod
  @catchError
  async gatherServiceDiagnostics(): Promise<ServiceDiagnosticData> {
    const serviceStatuses = await this.getServiceStatuses();
    
    // Get EventBus statistics (using fallback values since methods may not exist)
    const eventBusStats = {
      totalEvents: 0, // Fallback until EventBus interface is extended
      activeListeners: 0, // Fallback until EventBus interface is extended
      eventTypes: [] as string[] // Fallback until EventBus interface is extended
    };
    
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
        environment: process.env.NODE_ENV || 'unknown',
        version: process.env.REACT_APP_VERSION || 'unknown'
      }
    };

    const diagnosticData: ServiceDiagnosticData = {
      services: serviceStatuses,
      systemInfo,
      eventBusStats
    };

    this._cachedDiagnostics = diagnosticData;
    this.lastUpdateTime = this.timerService.getCurrentDate();
    
    return diagnosticData;
  }

  @logMethod
  @catchError
  async getServiceStatuses(): Promise<ServiceStatus[]> {
    const statuses: ServiceStatus[] = [];

    // Notification Service diagnostics
    try {
      const notificationStats = this.notificationService.getStatistics();
      const notificationStatus = this.notificationService.getStatus();

      statuses.push({
        name: 'NotificationService',
        isRunning: notificationStatus.isRunning,
        status: `Active: ${notificationStatus.isRunning ? 'YES' : 'NO'} | Queue: ${notificationStatus.queueSize}`,
        stats: {
          totalNotifications: notificationStats.totalNotifications,
          displayedNotifications: notificationStats.displayedNotifications,
          throttledNotifications: notificationStats.throttledNotifications,
          filteredNotifications: notificationStats.filteredNotifications
        },
        lastUpdate: this.timerService.getCurrentDate()
      });
    } catch (error) {
      statuses.push({
        name: 'NotificationService',
        isRunning: false,
        status: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error',
        lastUpdate: this.timerService.getCurrentDate()
      });
    }

    // Error Reporting Service diagnostics
    try {
      const errorStats = this.errorReportingService.getStatistics();
      const isEnabled = this.errorReportingService.isEnabled();

      statuses.push({
        name: 'ErrorReportingService',
        isRunning: isEnabled,
        status: `Enabled: ${isEnabled ? 'YES' : 'NO'} | Errors: ${errorStats.totalErrors}`,
        stats: {
          totalErrors: errorStats.totalErrors,
          reportedErrors: errorStats.totalErrors, // Use totalErrors as fallback
          throttledErrors: 0, // Fallback until interface is extended
          successRate: 1.0 // Fallback until interface is extended
        },
        lastUpdate: this.timerService.getCurrentDate()
      });
    } catch (error) {
      statuses.push({
        name: 'ErrorReportingService',
        isRunning: false,
        status: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error',
        lastUpdate: this.timerService.getCurrentDate()
      });
    }

    // Configuration Service diagnostics
    try {
      const configLoaded = this.configLoaded;
      const configStatus = configLoaded ? 'LOADED' : 'NOT_LOADED';

      statuses.push({
        name: 'ConfigurationService',
        isRunning: configLoaded,
        status: `Status: ${configStatus}`,
        stats: {
          configLoaded,
          configSections: [] // Cannot access config sections without service injection
        },
        lastUpdate: this.timerService.getCurrentDate()
      });
    } catch (error) {
      statuses.push({
        name: 'ConfigurationService',
        isRunning: false,
        status: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error',
        lastUpdate: this.timerService.getCurrentDate()
      });
    }

    return statuses;
  }

  @logMethod
  isDebugModeEnabled(): boolean {
    return process.env.NODE_ENV === 'development';
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

  @OnEvent('ConfigurationLoaded')
  // @ts-expect-error - Method used by @OnEvent decorator but TypeScript cannot detect it
  private onConfigurationLoaded(event: ConfigurationLoadedEvent): void {
    this.configLoaded = true;
    this.logger.info('Configuration loaded', { loadedConfigs: event.loadedConfigs });
  }

  // Private helper methods
  private getMemoryUsage(): number {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize / this.config.defaultMetrics.memoryConversionFactor; // MB
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
    // @OnEvent subscriptions are set up automatically by the decorator
    this.logger.info('DebugOrchestratorService initialized and event subscriptions active');
  }

  public cleanup(): void {
    // @OnEvent subscriptions are cleaned up automatically by the decorator
    this.logger.info('DebugOrchestratorService cleanup completed');
  }
}
