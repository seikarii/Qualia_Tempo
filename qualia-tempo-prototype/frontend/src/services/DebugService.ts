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
import { logMethod, catchError, OnEvent, IBaseService, initializeEventSubscriptions, cleanupEventSubscriptions, BrowserOnly } from "../utils/decorators";
import { EVENT_TYPES } from "./contracts/constants";
import { AI_ANALYSIS_TYPES, SEVERITY_LEVELS, DEBUG_SESSION_PREFIX } from "./contracts/constants";
import type {
  IDebugService,
  DebugConfig,
  DebugStats,
  SystemSnapshot,
  AnalysisResult,
  ExportedDebugData,
  DebugInterface,
} from "./interfaces/IDebugService";
import type { ILogger } from "./interfaces/ILogger";
import type { ITimerService } from "./interfaces/ITimerService";
import type { IPerformanceService } from "./interfaces/IPerformanceService";
import type {
  DebugSession, 
  PerformanceMetrics, 
  AIAnalysisResult, 
  DebugServiceConfig
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
 * QUALIA.CODE v1.1: Constructor parameters object to comply with max 4 parameters rule
 */
export interface DebugServiceParams {
  logger: ILogger;
  timerService: ITimerService;
  config: DebugServiceConfig;
  performanceService: IPerformanceService;
}

/**
 * QUALIA.CODE v1.1 Compliant DebugService
 * AI-powered debugging and system analysis with event-driven architecture.
 * Now with full InversifyJS dependency injection support.
 */
@injectable()
export class DebugService implements IDebugService, IBaseService {
  private readonly logger: ILogger;
  private readonly timerService: ITimerService;
  private readonly _performanceService: IPerformanceService;
  private config!: DebugServiceConfig;
  private isStarted = false;
  // @ts-expect-error - eventListenerIds used in future EventBus subscription cleanup
  private eventListenerIds: string[] = [];

  // QUALIA.CODE v1.1: Required for @OnEvent lifecycle
  public _eventListeners: string[] = [];

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
  private lastQualiaState: QualiaState | unknown | null = null; // Binary protocol: stores debug info
  private gameStateHistory: string[] = [];
  private eventPatterns: Map<string, number[]> = new Map();

  /**
   * QUALIA.CODE v1.1: Pure Dependency Injection Constructor
   * Refactored to use parameter object to comply with max 4 parameters rule
   */
  constructor(
    @inject(TYPES.DebugServiceParams) params: DebugServiceParams,
  ) {
    this.logger = params.logger;
    this.timerService = params.timerService;
    this.config = params.config;
    this._performanceService = params.performanceService;
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
      // QUALIA.CODE v1.1: @OnEvent subscriptions handled automatically

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
      // QUALIA.CODE v1.1: @OnEvent subscriptions cleaned up automatically

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
  @BrowserOnly
  public getSystemSnapshot(): SystemSnapshot {
    return {
      timestamp: new Date(),
      services: {
        debugService: {
          isRunning: this.isStarted,
          eventsLogged: this.eventHistory.length,
          memoryUsage: this.calculateMemoryUsage(),
          uptime: this.currentSession
            ? Date.now() - this.currentSession.startTime.getTime()
            : 0,
          profilingEnabled: this.config.performance.enablePerformanceTracking,
          eventHistory: [...this.eventHistory],
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

      // Store results (convert to AnalysisResult format with all required properties)
      const convertedResults: AIAnalysisResult[] = analysis.map((result) => ({
        timestamp: new Date(),
        type: result.type,
        severity: result.severity,
        description: result.message ?? "No description available",
        data: result.metadata ?? {},
        suggestions: [],
        ...(result.message && { message: result.message }),
        ...(result.metadata && { metadata: result.metadata }),
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
  public exportDebugData(): ExportedDebugData {
    return {
      stats: this.getDebugStats(),
      snapshot: this.getSystemSnapshot(),
      analysis: this.performAIAnalysis(),
      exportTimestamp: Date.now(),
      version: this.config.version,
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
      id: `${DEBUG_SESSION_PREFIX}${Date.now()}_${Math.random().toString(this.config.sessionIdBase).substr(this.config.sessionIdPrefixLength, this.config.sessionIdLength)}`,
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
      if (this.sessionHistory.length > this.config.maxSessionHistory) {
        // Use configured maxSessionHistory
        this.sessionHistory = this.sessionHistory.slice(-this.config.maxSessionHistory);
      }

      this.logger.info(
        `🔍 [DebugService] Ended debug session: ${this.currentSession.id} (${this.currentSession.events.length} events)`,
      );
      this.currentSession = null;
    }
  }

  // @ts-expect-error - Used by @OnEvent decorator
  @logMethod()
  @OnEvent('*')
  public handleGenericEvent(event: BaseEvent): void {
    this.recordEvent(event);
    this.updateEventPatterns(event.type);
    this.updatePerformanceMetrics(event.type, this._performanceService.now());

    // Type-specific handling
    switch (event.type) {
      case EVENT_TYPES.QUALIA_STATE_CALCULATED:
        this.handleQualiaStateCalculatedEvent(event as QualiaStateCalculatedEvent);
        break;
      case "QualiaParticleDataReceived":
        this.handleQualiaParticleDataReceivedEvent(event as QualiaParticleDataReceivedEvent);
        break;
      case EVENT_TYPES.ERROR:
        this.handleErrorEvent(event as ErrorEvent);
        break;
      case EVENT_TYPES.GAME_STATE_CHANGED:
        this.handleGameStateEvent(event as GameStateChangedEvent);
        break;
      case EVENT_TYPES.PLAYER_ACTION:
        this.handlePlayerActionEvent(event as PlayerActionEvent);
        break;
      case "BackendSync":
        this.handleBackendSyncEvent(event as BackendSyncEvent);
        break;
    }
  }

  private handlePlayerActionEvent(event: PlayerActionEvent): void {
    this.updateEventPatterns(event.type, event.action);
    this.updatePerformanceMetrics(EVENT_TYPES.PLAYER_ACTION, this._performanceService.now());
  }

  private handleQualiaStateCalculatedEvent(event: QualiaStateCalculatedEvent): void {
    // Store the calculated qualia state for debugging
    this.lastQualiaState = event.qualiaState;
    this.updatePerformanceMetrics(EVENT_TYPES.QUALIA_STATE_CALCULATED, this._performanceService.now());

    // Track QualiaState calculation rate
    this.performanceMetrics.qualiaStateUpdateRate++;
    
    this.logger.debug(
      "🔍 [DebugService] QualiaState calculated from player actions:",
      event.qualiaState as unknown as Record<string, unknown>
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
    if (timestamps.length > this.config.maxEventPatternTimestamps) {
      timestamps.splice(0, timestamps.length - this.config.maxEventPatternTimestamps);
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
    if (times.length > this.config.maxEventProcessingTimeMeasurements) times.shift(); // Keep configured measurements
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
    }, this.config.aiAnalysisInterval); // Use configuration interval
  }

  private startMemoryCleanup(): void {
    this.memoryCleanupInterval = this.timerService.setInterval(() => {
      this.performMemoryCleanup();
    }, this.config.memoryCleanupInterval); // Use configuration interval
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
    // QUALIA.CODE v1.1: Use abstracted IPerformanceService instead of direct platform API
    // Collect memory usage
    const memoryInfo = this._performanceService.getMemoryInfo();
    if (memoryInfo.usedJSHeapSize !== undefined) {
      this.performanceMetrics.memoryUsage.push(memoryInfo.usedJSHeapSize);
      if (this.performanceMetrics.memoryUsage.length > this.config.maxMemoryUsageHistory) {
        this.performanceMetrics.memoryUsage.shift();
      }
    }
  }

  private performMemoryCleanup(): void {
    const totalEvents =
      this.eventHistory.length + this.aiAnalysisResults.length;

    if (totalEvents > this.config.memoryCleanupThreshold) {
      // Use configuration threshold
      // Clean up old events
      this.eventHistory = this.eventHistory.slice(
        -Math.floor(this.config.eventMonitoring.maxEventHistory * this.config.memoryCleanupRatio),
      );

      // Clean up old AI analysis
      this.aiAnalysisResults = this.aiAnalysisResults.slice(-this.config.maxAIAnalysisHistory);

      // Clean up error history
      this.errorHistory = this.errorHistory.slice(-(this.config.maxErrorHistory ?? 100));

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
      if (errors.length > this.config.aiAnalysis.errorPatternThresholds.medium) {
        results.push({
          timestamp: new Date(),
          type: AI_ANALYSIS_TYPES.ERROR_PATTERN,
          severity: errors.length > this.config.aiAnalysis.errorPatternThresholds.high ? SEVERITY_LEVELS.HIGH : SEVERITY_LEVELS.MEDIUM,
          description: `Recurring error pattern detected: "${message}"`,
          data: { message, count: errors.length, errors },
          suggestions: ["Review error handling for this operation", "Consider adding retry logic", "Check input validation"],
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
      if (avgTime > this.config.eventProcessingTimeThreshold) {
        // Configurable threshold for event processing time
        results.push({
          timestamp: new Date(),
          type: AI_ANALYSIS_TYPES.PERFORMANCE_ISSUE,
          severity: avgTime > this.config.eventProcessingTimeHighThreshold ? SEVERITY_LEVELS.HIGH : SEVERITY_LEVELS.MEDIUM,
          description: `Slow event processing detected for ${eventType}`,
          data: {
            eventType,
            averageTime: avgTime,
            measurements: times.length,
          },
          suggestions: ["Consider optimizing event handlers", "Review event processing pipeline", "Check for blocking operations"],
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
            timestamp: new Date(),
            type: AI_ANALYSIS_TYPES.STATE_ANOMALY,
            severity: SEVERITY_LEVELS.MEDIUM,
            description: `QualiaState ${key} out of bounds: ${value}`,
            data: {
              property: key,
              value,
              state: this.lastQualiaState,
            },
            suggestions: ["Review qualia state calculation logic", "Check input validation", "Monitor state transitions"],
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
    if (this.performanceMetrics.errorRate > this.config.aiAnalysis.recommendationThresholds.highErrorRate) {
      results.push({
        timestamp: new Date(),
        type: AI_ANALYSIS_TYPES.RECOMMENDATION,
        severity: SEVERITY_LEVELS.MEDIUM,
        description: "High error rate detected in system",
        data: {
          errorRate: this.performanceMetrics.errorRate,
        },
        suggestions: ["Review error handling logic", "Implement circuit breaker pattern", "Add retry mechanisms"],
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

    // Create debugging interface object matching IDebugService.DebugInterface
    // PLUS additional development methods for enhanced debugging
    const debugInterface: DebugInterface = {
      // Official DebugInterface methods
      logServiceStatus: () => this.logServiceStatus(),
      getMetrics: () => this.getMetrics(),
      getSystemSnapshot: () => this.getSystemSnapshot(),
      performAIAnalysis: () => this.performAIAnalysis(),
      exportDebugData: () => this.exportDebugData(),

      // Additional development methods (not part of official interface)
      // These are attached to the object but not enforced by TypeScript
      getStats: () => this.getDebugStats(),
      getSnapshot: () => this.getSystemSnapshot(),
      performAnalysis: () => this.performAIAnalysis(),
      exportData: () => this.exportDebugData(),
      startSession: () => this.startNewSession(),
      endSession: () => this.endCurrentSession(),
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
      log: (message: string, data?: unknown) => {
        this.logger.info(`🔧 [QA_DEBUG] ${message}`, data as Record<string, unknown> ?? {});
      },
    } as DebugInterface & {
      getStats: () => DebugStats;
      getSnapshot: () => SystemSnapshot;
      performAnalysis: () => AIAnalysisResult[];
      exportData: () => ExportedDebugData;
      startSession: () => void;
      endSession: () => void;
      clearHistory: () => void;
      enableAI: () => void;
      disableAI: () => void;
      log: (_message: string, _data?: unknown) => void;
    };

    this.logger.info(
      "🌐 [DebugService] Global debugging interface created with full development functionality",
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

  /**
   * Attach the debug interface to the global scope (window.QA_DEBUG).
   * Only available in development mode with debug overlay enabled.
   */
  @logMethod
  @catchError
  @BrowserOnly
  public attachToGlobalScope(): void {
    if (!this.config.development.enableDebugOverlay) {
      return;
    }

    if (this.debugInterface && typeof window !== 'undefined') {
      const debugKey = 'QA_DEBUG';
      (window as unknown as Record<string, unknown>)[debugKey] = this.debugInterface;
      this.logger.info(`🌐 [DebugService] Debug interface attached to window.${debugKey}`);
    } else {
      this.logger.warn('🌐 [DebugService] Cannot attach debug interface: interface not available or not in browser environment');
    }
  }

  private logCurrentConfig(): void {
    // QUALIA.CODE v1.1: Log ACTUAL config values instead of hardcoded defaults
    this.logger.info("📊 [DebugService] Current Configuration:", {
      maxSessionHistory: this.config.maxSessionHistory,
      maxEventHistory: this.config.eventMonitoring.maxEventHistory,
      performanceMonitoringInterval: `${this.config.performance.metricsUpdateInterval}ms`,
      aiAnalysisInterval: `${this.config.aiAnalysisInterval}ms`,
      enableAIAnalysis: this.config.enableAIAnalysis,
      enablePerformanceMonitoring:
        this.config.performance.enablePerformanceTracking,
      enableGlobalInterface: this.config.development.enableDebugOverlay,
      memoryCleanupThreshold: this.config.memoryCleanupThreshold,
      memoryCleanupInterval: `${this.config.memoryCleanupInterval}ms`,
      maxMemoryUsageHistory: this.config.maxMemoryUsageHistory ?? 100,
      maxAIAnalysisHistory: this.config.maxAIAnalysisHistory ?? 50,
      maxErrorHistory: this.config.maxErrorHistory ?? 100,
    });
  }

  // QUALIA.CODE v1.1: IBaseService implementation
  public initialize(): void {
    this.logger.info('🚀 [DebugService] Initializing service with @OnEvent lifecycle...');
    // Activa todas las suscripciones de eventos declaradas con @OnEvent
    initializeEventSubscriptions(this);
  }

  @logMethod
  public cleanup(): void {
    this.logger.info('🧹 [DebugService] Cleaning up service...');
    // Limpia todas las suscripciones de eventos para prevenir memory leaks
    cleanupEventSubscriptions(this);
    // Additional cleanup for intervals and sessions
    this.stopAllIntervals();
    this.performMemoryCleanup();
    if (this.currentSession) {
      this.endCurrentSession();
    }
  }
}
