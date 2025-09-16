/**
 * QUALIA.CODE v1.0 - DebugService
 * AI-powered debugging and system analysis service for Qualia Tempo.
 *
 * Architecture:
 * - Event-driven monitoring of all system events
 * - AI-powered error analysis and pattern recognition
 * - Real-time performance monitoring and bottleneck detection
 * - Global debugging interface via window.QA_DEBUG
 * - Integration with ErrorReportingService for enhanced error insights
 * - Memory-efficient event tracking with automatic cleanup
 */

import {
  EventBus,
  EventHandler,
  QualiaStateUpdatedEvent,
  GameStateChangedEvent,
  PlayerActionEvent,
  ErrorEvent,
  BackendSyncEvent,
} from './EventBus';
import { logMethod, catchError } from '../utils/decorators';
import { QualiaState } from "../types/contracts";
import { QualiaLogger } from './Logger';

// Base event interface for debugging
export interface BaseEvent {
  type: string;
  timestamp: Date;
  source?: string;
  data?: any;
}

// Backend synchronization event interface - REMOVED: Using EventBus definition

// Debug session interface for tracking debugging activities
export interface DebugSession {
  id: string;
  startTime: Date;
  events: BaseEvent[];
  errors: ErrorEvent[];
  performance: PerformanceMetrics;
  aiAnalysis?: AIAnalysisResult[];
}

// Performance metrics for system monitoring
export interface PerformanceMetrics {
  eventProcessingTimes: Map<string, number[]>;
  memoryUsage: number[];
  eventFrequency: Map<string, number>;
  errorRate: number;
  averageResponseTime: number;
  qualiaStateUpdateRate: number;
}

// AI analysis result interface
export interface AIAnalysisResult {
  timestamp: Date;
  type:
    | "error_pattern"
    | "performance_issue"
    | "state_anomaly"
    | "recommendation";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  data: any;
  suggestions: string[];
}

// Configuration interface for DebugService
export interface DebugConfig {
  maxSessionHistory: number;
  maxEventHistory: number;
  performanceMonitoringInterval: number;
  aiAnalysisInterval: number;
  enableAIAnalysis: boolean;
  enablePerformanceMonitoring: boolean;
  enableGlobalInterface: boolean;
  memoryCleanupThreshold: number;
}

// Default configuration
const DEFAULT_DEBUG_CONFIG: DebugConfig = {
  maxSessionHistory: 10,
  maxEventHistory: 500,
  performanceMonitoringInterval: 5000, // 5 seconds
  aiAnalysisInterval: 30000, // 30 seconds
  enableAIAnalysis: true,
  enablePerformanceMonitoring: true,
  enableGlobalInterface: true,
  memoryCleanupThreshold: 1000, // Events
};

/**
 * QUALIA.CODE v1.0 Compliant DebugService
 * AI-powered debugging and system analysis with event-driven architecture.
 */
export class DebugService {
  private eventBus: EventBus;
  private logger: QualiaLogger;
  private config: DebugConfig;
  private isRunning = false;
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

  // State tracking for advanced analysis
  private lastQualiaState: QualiaState | null = null;
  private gameStateHistory: string[] = [];
  private eventPatterns: Map<string, number[]> = new Map();

  /**
   * QUALIA.CODE v1.0: Dependency Injection Constructor
   */
  constructor(eventBus: EventBus, logger: QualiaLogger, initialConfig?: Partial<DebugConfig>) {
    if (!eventBus) {
      throw new Error(
        "🚨 [DebugService] EventBus is required for QUALIA.CODE v1.0 compliance",
      );
    }

    this.eventBus = eventBus;
    this.logger = logger;
    this.config = { ...DEFAULT_DEBUG_CONFIG, ...initialConfig };
    this.performanceMetrics = this.initializePerformanceMetrics();

    this.logger.info(
      "🔧 [DebugService] Service initialized with AI debugging capabilities",
    );
    this.logCurrentConfig();

    // Setup global interface if enabled
    this.setupGlobalInterface();
  }

  /**
   * Start the DebugService and begin monitoring all system events.
   */
  @logMethod()
  @catchError()
  public start(): void {
    if (this.isRunning) {
      this.logger.warn("⚠️ [DebugService] Service already running");
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

      this.isRunning = true;
      this.logger.info("🚀 [DebugService] Service started - AI debugging active");
    } catch (error) {
      this.logger.error("🚨 [DebugService] Failed to start service:", { error });
      throw error;
    }
  }

  /**
   * Stop the DebugService and clean up resources.
   */
  @logMethod()
  @catchError()
  public stop(): void {
    if (!this.isRunning) {
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

      this.isRunning = false;
      this.logger.info("🛑 [DebugService] Service stopped");
    } catch (error) {
      this.logger.error("🚨 [DebugService] Error stopping service:", { error });
    }
  }

  /**
   * Update DebugService configuration.
   */
  @logMethod()
  @catchError()
  public updateConfig(newConfig: Partial<DebugConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.info("⚙️ [DebugService] Configuration updated");
    this.logCurrentConfig();

    // Restart intervals if running
    if (this.isRunning) {
      this.stopAllIntervals();
      this.startPerformanceMonitoring();
      this.startAIAnalysis();
      this.startMemoryCleanup();
    }
  }

  /**
   * Get current debug statistics and system health.
   */
  @logMethod()
  @catchError()
  public getDebugStats(): {
    isRunning: boolean;
    currentSession: DebugSession | null;
    totalEvents: number;
    totalErrors: number;
    aiAnalysisCount: number;
    performanceMetrics: PerformanceMetrics;
    memoryUsage: number;
  } {
    return {
      isRunning: this.isRunning,
      currentSession: this.currentSession,
      totalEvents: this.eventHistory.length,
      totalErrors: this.errorHistory.length,
      aiAnalysisCount: this.aiAnalysisResults.length,
      performanceMetrics: this.performanceMetrics,
      memoryUsage: this.calculateMemoryUsage(),
    };
  }

  /**
   * Perform AI analysis on recent events and errors.
   */
  @logMethod()
  @catchError()
  public performAIAnalysis(): AIAnalysisResult[] {
    this.logger.info("🤖 [DebugService] Performing AI analysis...");

    const analysis: AIAnalysisResult[] = [];

    try {
      // Analyze error patterns
      analysis.push(...this.analyzeErrorPatterns());

      // Analyze performance issues
      analysis.push(...this.analyzePerformanceIssues());

      // Analyze QualiaState anomalies
      analysis.push(...this.analyzeQualiaStateAnomalies());

      // Generate recommendations
      analysis.push(...this.generateRecommendations());

      // Store results
      this.aiAnalysisResults.push(...analysis);

      this.logger.info(
        `🤖 [DebugService] AI analysis complete - ${analysis.length} insights generated`,
      );
    } catch (error) {
      this.logger.error("🚨 [DebugService] AI analysis failed:", { error });
    }

    return analysis;
  }

  /**
   * Get system state snapshot for debugging.
   */
  @logMethod()
  @catchError()
  public getSystemSnapshot(): {
    eventBus: any;
    qualiaState: QualiaState | null;
    gameState: string;
    recentEvents: BaseEvent[];
    recentErrors: ErrorEvent[];
    performance: PerformanceMetrics;
  } {
    return {
      eventBus: this.eventBus.getStats(),
      qualiaState: this.lastQualiaState,
      gameState:
        this.gameStateHistory[this.gameStateHistory.length - 1] || "Unknown",
      recentEvents: this.eventHistory.slice(-20),
      recentErrors: this.errorHistory.slice(-10),
      performance: this.performanceMetrics,
    };
  }

  /**
   * Export debug session data for external analysis.
   */
  @logMethod()
  @catchError()
  public exportDebugData(): {
    sessions: DebugSession[];
    eventHistory: BaseEvent[];
    errorHistory: ErrorEvent[];
    aiAnalysis: AIAnalysisResult[];
    config: DebugConfig;
  } {
    return {
      sessions: this.sessionHistory,
      eventHistory: this.eventHistory,
      errorHistory: this.errorHistory,
      aiAnalysis: this.aiAnalysisResults,
      config: this.config,
    };
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
      id: `debug_session_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
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
      const finalAnalysis = this.performAIAnalysis();
      this.currentSession.aiAnalysis = finalAnalysis;

      // Add to session history
      this.sessionHistory.push(this.currentSession);

      // Maintain session history limit
      if (this.sessionHistory.length > this.config.maxSessionHistory) {
        this.sessionHistory = this.sessionHistory.slice(
          -this.config.maxSessionHistory,
        );
      }

      this.logger.info(
        `🔍 [DebugService] Ended debug session: ${this.currentSession.id} (${this.currentSession.events.length} events)`,
      );
      this.currentSession = null;
    }
  }

  private subscribeToAllEvents(): void {
    // Subscribe to PlayerAction events
    const playerActionHandler: EventHandler<PlayerActionEvent> = (event) => {
      this.handlePlayerActionEvent(event);
    };
    this.eventListenerIds.push(
      this.eventBus.subscribe("PlayerAction", playerActionHandler),
    );

    // Subscribe to QualiaStateUpdated events
    const qualiaStateHandler: EventHandler<QualiaStateUpdatedEvent> = (
      event,
    ) => {
      this.handleQualiaStateEvent(event);
    };
    this.eventListenerIds.push(
      this.eventBus.subscribe("QualiaStateUpdated", qualiaStateHandler),
    );

    // Subscribe to Error events
    const errorHandler: EventHandler<ErrorEvent> = (event) => {
      this.handleErrorEvent(event);
    };
    this.eventListenerIds.push(this.eventBus.subscribe("Error", errorHandler));

    // Subscribe to GameStateChanged events
    const gameStateHandler: EventHandler<GameStateChangedEvent> = (event) => {
      this.handleGameStateEvent(event);
    };
    this.eventListenerIds.push(
      this.eventBus.subscribe("GameStateChanged", gameStateHandler),
    );

    // Subscribe to BackendSync events
    const backendSyncHandler: EventHandler<BackendSyncEvent> = (event) => {
      this.handleBackendSyncEvent(event);
    };
    this.eventListenerIds.push(
      this.eventBus.subscribe("BackendSync", backendSyncHandler),
    );

    this.logger.info(
      `📡 [DebugService] Subscribed to ${this.eventListenerIds.length} event types`,
    );
  }

  private unsubscribeFromAllEvents(): void {
    for (const listenerId of this.eventListenerIds) {
      this.eventBus.unsubscribe(listenerId);
    }
    this.eventListenerIds = [];
    this.logger.info("📡 [DebugService] Unsubscribed from all events");
  }

  private handlePlayerActionEvent(event: PlayerActionEvent): void {
    this.recordEvent(event);
    this.updateEventPatterns(event.type, event.action);
    this.updatePerformanceMetrics("PlayerAction", performance.now());
  }

  private handleQualiaStateEvent(event: QualiaStateUpdatedEvent): void {
    this.recordEvent(event);
    this.lastQualiaState = event.qualiaState;
    this.updatePerformanceMetrics("QualiaStateUpdated", performance.now());

    // Track QualiaState update rate
    this.performanceMetrics.qualiaStateUpdateRate++;
  }

  private handleErrorEvent(event: ErrorEvent): void {
    this.recordEvent(event);
    this.errorHistory.push(event);
    this.updatePerformanceMetrics("Error", performance.now());

    // Update error rate
    this.performanceMetrics.errorRate =
      this.errorHistory.length / this.eventHistory.length;

    this.logger.info(
      `🚨 [DebugService] Error captured: ${event.severity} - ${event.error.message}`,
    );
  }

  private handleGameStateEvent(event: GameStateChangedEvent): void {
    this.recordEvent(event);
    this.gameStateHistory.push(event.newState);
    this.updatePerformanceMetrics("GameStateChanged", performance.now());
  }

  private handleBackendSyncEvent(event: BackendSyncEvent): void {
    this.recordEvent(event);
    this.updatePerformanceMetrics("BackendSync", performance.now());
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
    if (this.eventHistory.length > this.config.maxEventHistory) {
      this.eventHistory = this.eventHistory.slice(-this.config.maxEventHistory);
    }
  }

  private updateEventPatterns(eventType: string, action?: string): void {
    const key = action ? `${eventType}:${action}` : eventType;
    const timestamps = this.eventPatterns.get(key) || [];
    timestamps.push(Date.now());

    // Keep only last 100 timestamps
    if (timestamps.length > 100) {
      timestamps.splice(0, timestamps.length - 100);
    }

    this.eventPatterns.set(key, timestamps);
  }

  private updatePerformanceMetrics(
    eventType: string,
    processingTime: number,
  ): void {
    // Update event processing times
    const times =
      this.performanceMetrics.eventProcessingTimes.get(eventType) || [];
    times.push(processingTime);
    if (times.length > 50) times.shift(); // Keep last 50 measurements
    this.performanceMetrics.eventProcessingTimes.set(eventType, times);

    // Update event frequency
    const frequency =
      this.performanceMetrics.eventFrequency.get(eventType) || 0;
    this.performanceMetrics.eventFrequency.set(eventType, frequency + 1);

    // Update average response time
    const allTimes = Array.from(
      this.performanceMetrics.eventProcessingTimes.values(),
    ).flat();
    this.performanceMetrics.averageResponseTime =
      allTimes.reduce((a, b) => a + b, 0) / allTimes.length;
  }

  private startPerformanceMonitoring(): void {
    if (!this.config.enablePerformanceMonitoring) return;

    this.performanceMonitoringInterval = window.setInterval(() => {
      this.collectPerformanceMetrics();
    }, this.config.performanceMonitoringInterval);
  }

  private startAIAnalysis(): void {
    if (!this.config.enableAIAnalysis) return;

    this.aiAnalysisInterval = window.setInterval(() => {
      this.performAIAnalysis();
    }, this.config.aiAnalysisInterval);
  }

  private startMemoryCleanup(): void {
    this.memoryCleanupInterval = window.setInterval(() => {
      this.performMemoryCleanup();
    }, 60000); // Every minute
  }

  private stopAllIntervals(): void {
    if (this.performanceMonitoringInterval) {
      clearInterval(this.performanceMonitoringInterval);
      this.performanceMonitoringInterval = null;
    }

    if (this.aiAnalysisInterval) {
      clearInterval(this.aiAnalysisInterval);
      this.aiAnalysisInterval = null;
    }

    if (this.memoryCleanupInterval) {
      clearInterval(this.memoryCleanupInterval);
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

    if (totalEvents > this.config.memoryCleanupThreshold) {
      // Clean up old events
      this.eventHistory = this.eventHistory.slice(
        -Math.floor(this.config.maxEventHistory * 0.8),
      );

      // Clean up old AI analysis
      this.aiAnalysisResults = this.aiAnalysisResults.slice(-50);

      // Clean up error history
      this.errorHistory = this.errorHistory.slice(-100);

      this.logger.info("🧹 [DebugService] Memory cleanup performed");
    }
  }

  private calculateMemoryUsage(): number {
    return (
      this.eventHistory.length +
      this.errorHistory.length +
      this.aiAnalysisResults.length
    );
  }

  // AI Analysis Methods

  private analyzeErrorPatterns(): AIAnalysisResult[] {
    const results: AIAnalysisResult[] = [];

    // Group errors by message
    const errorGroups = new Map<string, ErrorEvent[]>();
    this.errorHistory.forEach((error) => {
      const key = error.error.message;
      const group = errorGroups.get(key) || [];
      group.push(error);
      errorGroups.set(key, group);
    });

    // Identify frequent errors
    errorGroups.forEach((errors, message) => {
      if (errors.length > 3) {
        results.push({
          timestamp: new Date(),
          type: "error_pattern",
          severity: errors.length > 10 ? "high" : "medium",
          description: `Recurring error pattern detected: "${message}"`,
          data: { message, count: errors.length, errors },
          suggestions: [
            "Investigate root cause of recurring error",
            "Add error prevention logic",
            "Consider user experience impact",
          ],
        });
      }
    });

    return results;
  }

  private analyzePerformanceIssues(): AIAnalysisResult[] {
    const results: AIAnalysisResult[] = [];

    // Check for slow event processing
    this.performanceMetrics.eventProcessingTimes.forEach((times, eventType) => {
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      if (avgTime > 50) {
        // 50ms threshold
        results.push({
          timestamp: new Date(),
          type: "performance_issue",
          severity: avgTime > 100 ? "high" : "medium",
          description: `Slow event processing detected for ${eventType}`,
          data: { eventType, averageTime: avgTime, measurements: times.length },
          suggestions: [
            "Optimize event handler logic",
            "Consider async processing",
            "Profile code for bottlenecks",
          ],
        });
      }
    });

    return results;
  }

  private analyzeQualiaStateAnomalies(): AIAnalysisResult[] {
    const results: AIAnalysisResult[] = [];

    if (this.lastQualiaState) {
      // Check for extreme values
      Object.entries(this.lastQualiaState).forEach(([key, value]) => {
        if (typeof value === "number" && (value < 0 || value > 1)) {
          results.push({
            timestamp: new Date(),
            type: "state_anomaly",
            severity: "medium",
            description: `QualiaState ${key} out of bounds: ${value}`,
            data: { property: key, value, state: this.lastQualiaState },
            suggestions: [
              "Check calculation logic for bounds enforcement",
              "Add value clamping",
              "Investigate data source",
            ],
          });
        }
      });
    }

    return results;
  }

  private generateRecommendations(): AIAnalysisResult[] {
    const results: AIAnalysisResult[] = [];

    // High error rate recommendation
    if (this.performanceMetrics.errorRate > 0.1) {
      results.push({
        timestamp: new Date(),
        type: "recommendation",
        severity: "medium",
        description: "High error rate detected in system",
        data: { errorRate: this.performanceMetrics.errorRate },
        suggestions: [
          "Implement comprehensive error handling",
          "Add input validation",
          "Monitor system health more closely",
        ],
      });
    }

    return results;
  }

  private setupGlobalInterface(): void {
    // Only setup if enabled in config
    if (!this.config.enableGlobalInterface) {
      return;
    }

    // Expose debugging interface globally
    (window as any).QA_DEBUG = {
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
        this.logger.info("🧹 [DebugService] History cleared via global interface");
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
      log: (message: string, data?: any) => {
        this.logger.info(`🔧 [QA_DEBUG] ${message}`, data || "");
      },
    };

    this.logger.info(
      "🌐 [DebugService] Global debugging interface exposed as window.QA_DEBUG",
    );
  }

  private logCurrentConfig(): void {
    this.logger.info("📊 [DebugService] Current Configuration:", {
      maxSessionHistory: this.config.maxSessionHistory,
      maxEventHistory: this.config.maxEventHistory,
      performanceMonitoringInterval: `${this.config.performanceMonitoringInterval}ms`,
      aiAnalysisInterval: `${this.config.aiAnalysisInterval}ms`,
      enableAIAnalysis: this.config.enableAIAnalysis,
      enablePerformanceMonitoring: this.config.enablePerformanceMonitoring,
      enableGlobalInterface: this.config.enableGlobalInterface,
      memoryCleanupThreshold: this.config.memoryCleanupThreshold,
    });
  }
}

// Export for use in other services
export default DebugService;
