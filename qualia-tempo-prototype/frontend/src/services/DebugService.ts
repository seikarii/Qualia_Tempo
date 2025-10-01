/**
 * QUALIA.CODE v1.1 - DebugService
 * AI-powered debugging and system analysis service for Qualia Tempo.
 *
 * Architecture:
 * - Event-driven monitoring of all system events
 * - AI-powered error analysis and pattern recognition
 * - Real-time performance monitoring and bottleneck detection
 * - Global debugging interface via window.QA_DEBUG
 * - Integration with ErrorReportingService for enhanced error insights
 * - Memory-efficient event tracking with automatic cleanup
 * - Injectable service with pure DI compliance
 */

import { injectable, inject } from "inversify";
import { TYPES } from "./inversify.types";
import { logMethod, catchError } from "../utils/decorators";
import type {
  IDebugService,
  DebugConfig,
  DebugStats,
  SystemSnapshot,
  AnalysisResult,
} from "./interfaces/IDebugService";
import type { IEventBus } from "./interfaces/IEventBus";
import type { ILogger } from "./interfaces/ILogger";
import type { ITimerService, IPerformanceService } from "./interfaces/ITimerService";
import type { 
  DebugSession, 
  PerformanceMetrics, 
  AIAnalysisResult, 
  DebugServiceConfig, 
  DebugInterface, 
  DebugExportData 
} from "./contracts/IDebugService.contracts";
import type {
  BaseEvent,
  QualiaStateCalculatedEvent,
  QualiaParticleDataReceivedEvent,
  GameStateChangedEvent,
  PlayerActionEvent,
  ErrorEvent,
  BackendSyncEvent,
} from "./contracts/events.contracts";
import { QualiaState } from "../types/contracts";

// Export types for test compatibility
export type {
  DebugConfig,
  DebugStats,
  SystemSnapshot,
  AnalysisResult,
} from "./interfaces/IDebugService";

/**
 * QUALIA.CODE v1.1 Compliant DebugService
 * AI-powered debugging and system analysis with event-driven architecture.
 * Now with full InversifyJS dependency injection support.
 */
@injectable()
export class DebugService implements IDebugService {
  private readonly eventBus: IEventBus;
  private readonly logger: ILogger;
  private readonly timerService: ITimerService;
  // Configuration service for future extensibility
  // @ts-expect-error - Unused parameter for future configuration features
  private readonly _configService: IConfigurationService;
  private config!: DebugServiceConfig;
  private isStarted = false;
  private eventListenerIds: string[] = [];

  // Debug session management
  private currentSession: DebugSession | null = null;
  private sessionHistory: DebugSession[] = [];

  // Event tracking and analysis
  private eventHistory: BaseEvent[] = [];
  private errorHistory: ErrorEvent[] = [];
  private performanceMetrics: PerformanceMetrics;
  private aiAnalysisResults: AIAnalysisResult[] = [];

  // Monitoring intervals
  private performanceMonitoringInterval: number | null = null;
  private aiAnalysisInterval: number | null = null;
  private memoryCleanupInterval: number | null = null;

  // Debug interface for external access
  private debugInterface: DebugInterface | null = null;

  // State tracking for advanced analysis
  private lastQualiaState: QualiaState | any | null = null; // Binary protocol: stores debug info
  private gameStateHistory: string[] = [];
  private eventPatterns: Map<string, number[]> = new Map();

  /**
   * QUALIA.CODE v1.1: Pure Dependency Injection Constructor
   */
  constructor(
    @inject(TYPES.IEventBus) eventBus: IEventBus,
    @inject(TYPES.ILogger) logger: ILogger,
    @inject(TYPES.ITimerService) timerService: ITimerService,
    @inject(TYPES.DebugServiceConfig) config: DebugServiceConfig,
    @inject(TYPES.IPerformanceService) private readonly _performanceService: IPerformanceService,
  ) {
    if (!eventBus) {
      throw new Error(
        "🚨 [DebugService] EventBus is required for QUALIA.CODE v1.1 compliance",
      );
    }

    this.eventBus = eventBus;
    this.logger = logger;
    this.timerService = timerService;
    this.config = config;
    this.performanceMetrics = this.initializePerformanceMetrics();

    this.logger.info(
      "🔧 [DebugService] Service initialized with AI debugging capabilities and pure DI",
    );
  }

  /**
   * Start the DebugService and begin monitoring all system events.
   */
  @logMethod
  @catchError
  public start(): void {
    if (this.isStarted) {
      this.logger.warn("⚠️ [DebugService] Service already running");
      return;
    }

    try {
      this.logger.info("DebugService configuration loaded successfully.");
      this.logCurrentConfig(); // Log the newly loaded config
    } catch (error) {
      this.logger.error(
        "🚨 [DebugService] Failed to load configuration. Service cannot start.",
        { error },
      );
      // Detener la ejecución si la configuración es crítica y no se puede cargar
      return;
    }

    try {
      this.logger.info("🚀 [DebugService] Starting AI debugging service...");

      // Start new debug session
      this.startNewSession();

      // Subscribe to all events for comprehensive monitoring
      this.subscribeToAllEvents();

      // Start monitoring intervals
      this.startPerformanceMonitoring();
      this.startAIAnalysis();
      this.startMemoryCleanup();

      // Setup global interface if enabled
      this.debugInterface = this.setupGlobalInterface();

      this.isStarted = true;
      this.logger.info(
        "🚀 [DebugService] Service started - AI debugging active",
      );
    } catch (error) {
      this.logger.error("🚨 [DebugService] Failed to start service:", {
        error,
      });
      throw error;
    }
  }

  /**
   * Stop the DebugService and clean up resources.
   */
  @logMethod
  @catchError
  public stop(): void {
    if (!this.isStarted) {
      this.logger.warn("⚠️ [DebugService] Service not running");
      return;
    }

    try {
      this.logger.info("🛑 [DebugService] Stopping service...");

      // End current session
      this.endCurrentSession();

      // Unsubscribe from events
      this.unsubscribeFromAllEvents();

      // Stop monitoring intervals
      this.stopAllIntervals();

      // Perform final cleanup
      this.performMemoryCleanup();

      this.isStarted = false;
      this.logger.info("🛑 [DebugService] Service stopped");
    } catch (error) {
      this.logger.error("🚨 [DebugService] Error stopping service:", { error });
    }
  }

  /**
   * Log service status information.
   */
  @logMethod
  public logServiceStatus(): void {
    const status = {
      isStarted: this.isStarted,
      currentSession: this.currentSession?.id,
      eventHistory: this.eventHistory.length,
      errorHistory: this.errorHistory.length,
      aiAnalysisResults: this.aiAnalysisResults.length,
      uptime: this.currentSession
        ? Date.now() - this.currentSession.startTime.getTime()
        : 0,
    };

    this.logger.debug("DebugService status", status);
  }

  /**
   * Log EventBus activity for debugging.
   */
  @logMethod
  @catchError
  public logEvent(event: BaseEvent): void {
    if (!this.isStarted) {
      return;
    }

    this.recordEvent(event);
    this.updateEventPatterns(event.type);
    this.updatePerformanceMetrics(event.type, this._performanceService.now());
  }

  /**
   * Get performance metrics.
   */
  @logMethod
  @catchError
  public getMetrics(): {
    isRunning: boolean;
    eventsLogged: number;
    memoryUsage: number;
    uptime: number;
  } {
    return {
      isRunning: this.isStarted,
      eventsLogged: this.eventHistory.length,
      memoryUsage: this.calculateMemoryUsage(),
      uptime: this.currentSession
        ? Date.now() - this.currentSession.startTime.getTime()
        : 0,
    };
  }

  /**
   * Update DebugService configuration.
   */
  @logMethod
  @catchError
  public updateConfig(newConfig: Partial<DebugConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.info("⚙️ [DebugService] Configuration updated");
    this.logCurrentConfig();

    // Restart intervals if running
    if (this.isStarted) {
      this.stopAllIntervals();
      this.startPerformanceMonitoring();
      this.startAIAnalysis();
      this.startMemoryCleanup();
    }
  }

  /**
   * Get current debug statistics and system health.
   */
  @logMethod
  @catchError
  public getDebugStats(): DebugStats {
    return {
      isRunning: this.isStarted,
      eventsLogged: this.eventHistory.length,
      memoryUsage: this.calculateMemoryUsage(),
      uptime: this.currentSession
        ? Date.now() - this.currentSession.startTime.getTime()
        : 0,
      profilingEnabled: this.config.profiling.enableProfiling,
      eventHistory: [...this.eventHistory],
    };
  }

  /**
   * Get system state snapshot for debugging.
   */
  @logMethod
  @catchError
  public getSystemSnapshot(): SystemSnapshot {
    return {
      timestamp: Date.now(),
      services: {
        debugService: {
          isRunning: this.isStarted,
          eventsLogged: this.eventHistory.length,
          config: this.config,
        },
      },
      performance: {
        memoryUsage: this.calculateMemoryUsage(),
        uptime: this.currentSession
          ? Date.now() - this.currentSession.startTime.getTime()
          : 0,
      },
      eventHistory: [...this.eventHistory],
    };
  }

  /**
   * Perform AI analysis on recent events and errors.
   */
  @logMethod
  @catchError
  public performAIAnalysis(): AnalysisResult[] {
    this.logger.info("🤖 [DebugService] Performing AI analysis...");

    const analysis: AnalysisResult[] = [];

    try {
      // Analyze error patterns
      analysis.push(...this.analyzeErrorPatterns());

      // Analyze performance issues
      analysis.push(...this.analyzePerformanceIssues());

      // Analyze QualiaState anomalies
      analysis.push(...this.analyzeQualiaStateAnomalies());

      // Generate recommendations
      analysis.push(...this.generateRecommendations());

      // Store results (convert to AnalysisResult format)
      const convertedResults = analysis.map((result) => ({
        type: result.type,
        severity: result.severity,
        message: result.message,
        metadata: result.metadata,
      }));

      this.logger.info(
        `🤖 [DebugService] AI analysis complete - ${analysis.length} insights generated`,
      );

      return convertedResults;
    } catch (error) {
      this.logger.error("🚨 [DebugService] AI analysis failed:", { error });
      return [];
    }
  }

  /**
   * Export debug session data for external analysis.
   */
  @logMethod
  @catchError
  public exportDebugData(): DebugExportData {
    return {
      timestamp: Date.now(),
      sessions: this.sessionHistory,
      eventHistory: this.eventHistory,
      errorHistory: this.errorHistory,
      aiAnalysis: this.aiAnalysisResults,
      config: this.config,
      debugStats: this.getDebugStats(),
      systemSnapshot: this.getSystemSnapshot(),
      analysis: this.performAIAnalysis(),
    };
  }

  /**
   * Enable performance profiling.
   */
  @logMethod
  public enableProfiling(): void {
    this.config.profiling.enableProfiling = true;
    this.logger.info("Performance profiling enabled");
  }

  /**
   * Disable performance profiling.
   */
  @logMethod
  public disableProfiling(): void {
    this.config.profiling.enableProfiling = false;
    this.logger.info("Performance profiling disabled");
  }

  /**
   * Check if debugging is currently enabled.
   */
  @logMethod
  public isEnabled(): boolean {
    return this.isStarted;
  }

  /**
   * Set debug level for filtering debug output.
   */
  @logMethod
  public setDebugLevel(level: "minimal" | "normal" | "verbose"): void {
    this.config.logging.logLevel = level;
    this.logger.info(`Debug level set to: ${level}`);
  }

  // Private implementation methods

  private initializePerformanceMetrics(): PerformanceMetrics {
    return {
      eventProcessingTimes: new Map(),
      memoryUsage: [],
      eventFrequency: new Map(),
      errorRate: 0,
      averageResponseTime: 0,
      qualiaStateUpdateRate: 0,
    };
  }

  private startNewSession(): void {
    this.currentSession = {
      id: `debug_session_${Date.now()}_${Math.random().toString(36).substr(2, this.config.sessionIdLength ?? 8)}`,
      startTime: new Date(),
      events: [],
      errors: [],
      performance: this.initializePerformanceMetrics(),
      aiAnalysis: [],
    };

    this.logger.info(
      `🔍 [DebugService] Started new debug session: ${this.currentSession.id}`,
    );
  }

  private endCurrentSession(): void {
    if (this.currentSession) {
      // Perform final AI analysis for this session
      this.performAIAnalysis();

      // Add to session history
      this.sessionHistory.push(this.currentSession);

      // Maintain session history limit
      if (this.sessionHistory.length > (this.config.maxSessionHistory ?? 10)) {
        // Use configured maxSessionHistory
        this.sessionHistory = this.sessionHistory.slice(-(this.config.maxSessionHistory ?? 10));
      }

      this.logger.info(
        `🔍 [DebugService] Ended debug session: ${this.currentSession.id} (${this.currentSession.events.length} events)`,
      );
      this.currentSession = null;
    }
  }

  private subscribeToAllEvents(): void {
    // Subscribe to all event types for comprehensive monitoring
    const listenerId = this.eventBus.subscribe("*", (event: BaseEvent) => {
      this.handleGenericEvent(event);
    });
    this.eventListenerIds.push(listenerId);

    this.logger.info(`📡 [DebugService] Subscribed to all event types`);
  }

  private unsubscribeFromAllEvents(): void {
    for (const listenerId of this.eventListenerIds) {
      this.eventBus.unsubscribe(listenerId);
    }
    this.eventListenerIds = [];
    this.logger.info("📡 [DebugService] Unsubscribed from all events");
  }

  private handleGenericEvent(event: BaseEvent): void {
    this.recordEvent(event);
    this.updateEventPatterns(event.type);
    this.updatePerformanceMetrics(event.type, this._performanceService.now());

    // Type-specific handling
    switch (event.type) {
      case "QualiaStateCalculated":
        this.handleQualiaStateCalculatedEvent(event as QualiaStateCalculatedEvent);
        break;
      case "QualiaParticleDataReceived":
        this.handleQualiaParticleDataReceivedEvent(event as QualiaParticleDataReceivedEvent);
        break;
      case "Error":
        this.handleErrorEvent(event as ErrorEvent);
        break;
      case "GameStateChanged":
        this.handleGameStateEvent(event as GameStateChangedEvent);
        break;
      case "PlayerAction":
        this.handlePlayerActionEvent(event as PlayerActionEvent);
        break;
      case "BackendSync":
        this.handleBackendSyncEvent(event as BackendSyncEvent);
        break;
    }
  }

  private handlePlayerActionEvent(event: PlayerActionEvent): void {
    this.updateEventPatterns(event.type, event.action);
    this.updatePerformanceMetrics("PlayerAction", this._performanceService.now());
  }

  private handleQualiaStateCalculatedEvent(event: QualiaStateCalculatedEvent): void {
    // Store the calculated qualia state for debugging
    this.lastQualiaState = event.qualiaState;
    this.updatePerformanceMetrics("QualiaStateCalculated", this._performanceService.now());

    // Track QualiaState calculation rate
    this.performanceMetrics.qualiaStateUpdateRate++;
    
    this.logger.debug(
      "🔍 [DebugService] QualiaState calculated from player actions:",
      event.qualiaState
    );
  }

  private handleQualiaParticleDataReceivedEvent(event: QualiaParticleDataReceivedEvent): void {
    // Store particle data buffer info for debugging
    this.lastQualiaState = {
      particleBufferSize: event.particleData.byteLength,
      timestamp: event.timestamp,
      // Note: Actual QualiaState reconstruction from binary data would require particle parsing
    };
    this.updatePerformanceMetrics("QualiaParticleDataReceived", this._performanceService.now());

    // Track binary data throughput
    this.performanceMetrics.qualiaStateUpdateRate++;
    
    this.logger.debug(
      "🔍 [DebugService] Binary particle data received:",
      { size: event.particleData.byteLength, timestamp: event.timestamp }
    );
  }

  private handleErrorEvent(event: ErrorEvent): void {
    this.errorHistory.push(event);
    this.updatePerformanceMetrics("Error", this._performanceService.now());

    // Update error rate
    this.performanceMetrics.errorRate =
      this.errorHistory.length / this.eventHistory.length;

    this.logger.info(
      `🚨 [DebugService] Error captured: ${event.severity} - ${event.error.message}`,
    );
  }

  private handleGameStateEvent(event: GameStateChangedEvent): void {
    this.gameStateHistory.push(event.newState);
    this.updatePerformanceMetrics("GameStateChanged", this._performanceService.now());
  }

  private handleBackendSyncEvent(_event: BackendSyncEvent): void {
    this.updatePerformanceMetrics("BackendSync", this._performanceService.now());
  }

  private recordEvent(event: BaseEvent): void {
    // Add to event history
    this.eventHistory.push(event);

    // Add to current session
    if (this.currentSession) {
      this.currentSession.events.push(event);
      if (event.type === "Error") {
        this.currentSession.errors.push(event as ErrorEvent);
      }
    }

    // Maintain history limits
    if (
      this.eventHistory.length > this.config.eventMonitoring.maxEventHistory
    ) {
      this.eventHistory = this.eventHistory.slice(
        -this.config.eventMonitoring.maxEventHistory,
      );
    }
  }

  private updateEventPatterns(eventType: string, action?: string): void {
    const key = action ? `${eventType}:${action}` : eventType;
    const timestamps = this.eventPatterns.get(key) ?? [];
    timestamps.push(Date.now());

    // Keep only configured timestamps
    if (timestamps.length > (this.config.maxEventHistory ?? 100)) {
      timestamps.splice(0, timestamps.length - (this.config.maxEventHistory ?? 100));
    }

    this.eventPatterns.set(key, timestamps);
  }

  private updatePerformanceMetrics(
    eventType: string,
    processingTime: number,
  ): void {
    // Update event processing times
    const times =
      this.performanceMetrics.eventProcessingTimes.get(eventType) ?? [];
    times.push(processingTime);
    if (times.length > (this.config.maxEventHistory ?? 50)) times.shift(); // Keep configured measurements
    this.performanceMetrics.eventProcessingTimes.set(eventType, times);

    // Update event frequency
    const frequency =
      this.performanceMetrics.eventFrequency.get(eventType) ?? 0;
    this.performanceMetrics.eventFrequency.set(eventType, frequency + 1);

    // Update average response time
    const allTimes = Array.from(
      this.performanceMetrics.eventProcessingTimes.values(),
    ).flat();
    this.performanceMetrics.averageResponseTime =
      allTimes.reduce((a, b) => a + b, 0) / allTimes.length;
  }

  private startPerformanceMonitoring(): void {
    if (!this.config.performance.enablePerformanceTracking) return;

    this.performanceMonitoringInterval = this.timerService.setInterval(() => {
      this.collectPerformanceMetrics();
    }, this.config.performance.metricsUpdateInterval);
  }

  private startAIAnalysis(): void {
    if (!this.config.enableAIAnalysis) return; // Use configuration value

    this.aiAnalysisInterval = this.timerService.setInterval(() => {
      this.performAIAnalysis();
    }, this.config.aiAnalysisInterval ?? 30000); // Use configuration interval with fallback
  }

  private startMemoryCleanup(): void {
    this.memoryCleanupInterval = this.timerService.setInterval(() => {
      this.performMemoryCleanup();
    }, 60000); // Default memory cleanup interval: 1 minute
  }

  private stopAllIntervals(): void {
    if (this.performanceMonitoringInterval) {
      this.timerService.clearInterval(this.performanceMonitoringInterval);
      this.performanceMonitoringInterval = null;
    }

    if (this.aiAnalysisInterval) {
      this.timerService.clearInterval(this.aiAnalysisInterval);
      this.aiAnalysisInterval = null;
    }

    if (this.memoryCleanupInterval) {
      this.timerService.clearInterval(this.memoryCleanupInterval);
      this.memoryCleanupInterval = null;
    }
  }

  private collectPerformanceMetrics(): void {
    // Collect memory usage
    const perfMemory = (performance as any).memory;
    if (perfMemory && typeof perfMemory.usedJSHeapSize === "number") {
      this.performanceMetrics.memoryUsage.push(perfMemory.usedJSHeapSize);
      if (this.performanceMetrics.memoryUsage.length > 100) {
        this.performanceMetrics.memoryUsage.shift();
      }
    }
  }

  private performMemoryCleanup(): void {
    const totalEvents =
      this.eventHistory.length + this.aiAnalysisResults.length;

    if (totalEvents > (this.config.memoryCleanupThreshold ?? 1000)) {
      // Use configuration threshold
      // Clean up old events
      this.eventHistory = this.eventHistory.slice(
        -Math.floor(this.config.eventMonitoring.maxEventHistory * 0.8),
      );

      // Clean up old AI analysis
      this.aiAnalysisResults = this.aiAnalysisResults.slice(-50);

      // Clean up error history
      this.errorHistory = this.errorHistory.slice(-100);

      this.logger.info("🧹 [DebugService] Memory cleanup performed");
    }
  }

  private calculateMemoryUsage(): number {
    const memoryInfo = this._performanceService.getMemoryInfo();
    if (memoryInfo.usedJSHeapSize !== undefined) {
      return memoryInfo.usedJSHeapSize;
    }
    return (
      this.eventHistory.length +
      this.errorHistory.length +
      this.aiAnalysisResults.length
    );
  }

  // AI Analysis Methods

  private analyzeErrorPatterns(): AnalysisResult[] {
    const results: AnalysisResult[] = [];

    // Group errors by message
    const errorGroups = new Map<string, ErrorEvent[]>();
    this.errorHistory.forEach((error) => {
      const key = error.error.message;
      const group = errorGroups.get(key) ?? [];
      group.push(error);
      errorGroups.set(key, group);
    });

    // Identify frequent errors
    errorGroups.forEach((errors, message) => {
      if (errors.length > 3) {
        results.push({
          type: "error_pattern",
          severity: errors.length > 10 ? "high" : "medium",
          message: `Recurring error pattern detected: "${message}"`,
          metadata: { message, count: errors.length, errors },
        });
      }
    });

    return results;
  }

  private analyzePerformanceIssues(): AnalysisResult[] {
    const results: AnalysisResult[] = [];

    // Check for slow event processing
    this.performanceMetrics.eventProcessingTimes.forEach((times, eventType) => {
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      if (avgTime > 50) {
        // 50ms threshold
        results.push({
          type: "performance_issue" as any,
          severity: avgTime > 100 ? "high" : "medium",
          message: `Slow event processing detected for ${eventType}`,
          metadata: {
            eventType,
            averageTime: avgTime,
            measurements: times.length,
          },
        });
      }
    });

    return results;
  }

  private analyzeQualiaStateAnomalies(): AnalysisResult[] {
    const results: AnalysisResult[] = [];

    if (this.lastQualiaState) {
      // Check for extreme values
      Object.entries(this.lastQualiaState).forEach(([key, value]) => {
        if (typeof value === "number" && (value < 0 || value > 1)) {
          results.push({
            type: "state_anomaly",
            severity: "medium",
            message: `QualiaState ${key} out of bounds: ${value}`,
            metadata: { property: key, value, state: this.lastQualiaState },
          });
        }
      });
    }

    return results;
  }

  private generateRecommendations(): AnalysisResult[] {
    const results: AnalysisResult[] = [];

    // High error rate recommendation
    if (this.performanceMetrics.errorRate > 0.1) {
      results.push({
        type: "recommendation",
        severity: "medium",
        message: "High error rate detected in system",
        metadata: { errorRate: this.performanceMetrics.errorRate },
      });
    }

    return results;
  }

  private setupGlobalInterface(): DebugInterface | null {
    // Only setup if enabled in config
    if (!this.config.development.enableDebugOverlay) {
      return null;
    }

    // Create debugging interface object
    const debugInterface = {
      service: this,
      getStats: () => this.getDebugStats(),
      getSnapshot: () => this.getSystemSnapshot(),
      performAnalysis: () => this.performAIAnalysis(),
      exportData: () => this.exportDebugData(),
      startSession: () => this.startNewSession(),
      endSession: () => this.endCurrentSession(),

      // Utility functions
      clearHistory: () => {
        this.eventHistory = [];
        this.errorHistory = [];
        this.aiAnalysisResults = [];
        this.logger.info(
          "🧹 [DebugService] History cleared via global interface",
        );
      },

      enableAI: () => {
        this.updateConfig({ enableAIAnalysis: true });
        this.logger.info("🤖 [DebugService] AI analysis enabled");
      },

      disableAI: () => {
        this.updateConfig({ enableAIAnalysis: false });
        this.logger.info("🤖 [DebugService] AI analysis disabled");
      },

      // Helper for quick debugging
      log: (message: string, data?: unknown) => {
        this.logger.info(`🔧 [QA_DEBUG] ${message}`, data ?? "");
      },
    };

    this.logger.info(
      "🌐 [DebugService] Global debugging interface created (not attached to window)",
    );

    return debugInterface;
  }

  /**
   * Get the debug interface for external access (development only).
   */
  @logMethod
  public getDebugInterface(): DebugInterface | null {
    return this.debugInterface;
  }

  private logCurrentConfig(): void {
    this.logger.info("📊 [DebugService] Current Configuration:", {
      maxSessionHistory: 10, // Default value
      maxEventHistory: this.config.eventMonitoring.maxEventHistory,
      performanceMonitoringInterval: `${this.config.performance.metricsUpdateInterval}ms`,
      aiAnalysisInterval: "30000ms", // Default value
      enableAIAnalysis: true, // Default value
      enablePerformanceMonitoring:
        this.config.performance.enablePerformanceTracking,
      enableGlobalInterface: this.config.development.enableDebugOverlay,
      memoryCleanupThreshold: 1000, // Default value
    });
  }
}
