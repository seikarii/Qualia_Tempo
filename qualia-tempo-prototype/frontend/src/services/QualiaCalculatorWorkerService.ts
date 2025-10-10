/**
 * QUALIA.CODE v1.1 - QualiaCalculatorWorkerService
 * 
 * Worker-based service for QualiaState calculations.
 * Implements ARCHITECTURE.GOLD.CODE - DOMINIO 2 (Web Worker).
 * 
 * Architecture:
 * - Manages Web Worker lifecycle
 * - Bridges EventBus ↔ Worker postMessage
 * - Handles errors with fallback to main thread
 * - Monitors performance and health
 * - Implements @OnEvent pattern for event-driven architecture
 * 
 * Performance Benefits:
 * - Non-blocking UI thread
 * - Parallel state computation
 * - Instant visual feedback
 * 
 * CRITICAL: Uses InversifyJS dependency injection, follows QUALIA.CODE principles.
 */

import { injectable, inject } from 'inversify';
import { TYPES } from './inversify.types';
import type { IEventBus } from './interfaces/IEventBus';
import type { ILogger } from './interfaces/ILogger';
import type { ITimerService } from './interfaces/ITimerService';
import type { IQualiaStateCalculatorService } from './interfaces/IQualiaStateCalculatorService';
import type { IQualiaCalculatorWorkerService } from './interfaces/IQualiaCalculatorWorkerService';
import type { QualiaCalculatorConfig } from './contracts/IQualiaStateCalculatorService.contracts';
import type {
  QualiaCalculatorWorkerServiceConfig,
  WorkerServiceStats,
  WorkerHealthStatus,
} from './contracts/IQualiaCalculatorWorkerService.contracts';
import type { QualiaState } from '../types/contracts';
import type { PlayerActionEvent, GameTickEvent, QualiaStateCalculatedEvent } from './contracts/events.contracts';
import {
  logMethod,
  catchError,
  OnEvent,
  IBaseService,
  initializeEventSubscriptions,
  cleanupEventSubscriptions,
} from '../utils/decorators';
import type {
  WorkerInputMessage,
  WorkerOutputMessage,
  WorkerStats,
} from '../workers/types/worker-messages';
import {
  isStateCalculatedMessage,
  isLogMessage,
  isErrorMessage,
} from '../workers/types/worker-messages';

/**
 * Worker Service that manages QualiaState calculations in a Web Worker.
 * 
 * Design Philosophy:
 * - Worker as primary calculation engine
 * - Main thread service as fallback
 * - Event-driven communication
 * - Robust error handling and recovery
 * - Performance monitoring
 * 
 * ARCHITECTURE COMPLIANCE:
 * - Dependency Injection via InversifyJS
 * - Event-Driven via EventBus and @OnEvent
 * - No direct DOM manipulation
 * - Configurable via external config
 */
@injectable()
export class QualiaCalculatorWorkerService
  implements IQualiaCalculatorWorkerService, IBaseService
{
  private worker: Worker | null = null;
  private workerConfig: QualiaCalculatorWorkerServiceConfig;
  private calculatorConfig: QualiaCalculatorConfig;
  private eventBus: IEventBus;
  private logger: ILogger;
  private timerService: ITimerService;
  private fallbackService: IQualiaStateCalculatorService;

  // State
  private workerStatus: WorkerServiceStats['workerStatus'] = 'not-created';
  private usingFallback = false;
  private currentState: QualiaState;
  private workerCreatedAt?: number;

  // Statistics
  private workerRecreations = 0;
  private fallbackActivations = 0;
  private consecutiveErrors = 0;
  private lastError?: string;
  private lastSuccessfulOperation?: number;

  // Performance monitoring
  private performanceMonitoringInterval?: number;

  // Worker initialization promise
  private initializationPromise?: Promise<void>;

  constructor(
    @inject(TYPES.QualiaCalculatorWorkerServiceConfig) workerConfig: QualiaCalculatorWorkerServiceConfig,
    @inject(TYPES.QualiaCalculatorConfig) calculatorConfig: QualiaCalculatorConfig,
    @inject(TYPES.IEventBus) eventBus: IEventBus,
    @inject(TYPES.ILogger) logger: ILogger,
    @inject(TYPES.ITimerService) timerService: ITimerService,
    @inject(TYPES.IQualiaStateCalculatorService) fallbackService: IQualiaStateCalculatorService
  ) {
    this.workerConfig = workerConfig;
    this.calculatorConfig = calculatorConfig;
    this.eventBus = eventBus;
    this.logger = logger;
    this.timerService = timerService;
    this.fallbackService = fallbackService;

    // Initialize current state from config
    this.currentState = {
      intensity: this.calculatorConfig.baseQualiaState.intensity,
      precision: this.calculatorConfig.baseQualiaState.precision,
      aggression: this.calculatorConfig.baseQualiaState.aggression,
      flow: this.calculatorConfig.baseQualiaState.flow,
      chaos: this.calculatorConfig.baseQualiaState.chaos,
      recovery: this.calculatorConfig.baseQualiaState.recovery,
      transcendence: this.calculatorConfig.baseQualiaState.transcendence,
      collectionWindowEnd: 0,
    };

    this.logger.info('🔧 [WorkerService] Service constructed');
  }

  // ==================== LIFECYCLE METHODS ====================

  /**
   * Initialize the worker service.
   */
  @logMethod
  @catchError
  public async initialize(): Promise<void> {
    // If already initializing, return existing promise
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._initializeInternal();
    return this.initializationPromise;
  }

  private async _initializeInternal(): Promise<void> {
    this.logger.info('🚀 [WorkerService] Initializing...');

    // Set up event subscriptions
    initializeEventSubscriptions(this);

    // If worker is disabled, use fallback immediately
    if (!this.workerConfig.enabled) {
      this.logger.warn('⚠️ [WorkerService] Worker disabled in config, using fallback');
      await this.activateFallback();
      return;
    }

    // Create and initialize worker
    try {
      await this.createWorker();
      this.logger.info('✅ [WorkerService] Initialized successfully');
    } catch (error) {
      this.logger.error('❌ [WorkerService] Initialization failed, using fallback', error as Record<string, unknown>);
      await this.activateFallback();
    }

    // Start performance monitoring if enabled
    if (this.workerConfig.enablePerformanceMonitoring) {
      this.startPerformanceMonitoring();
    }
  }

  /**
   * Clean up the worker service.
   */
  @logMethod
  public cleanup(): void {
    this.logger.info('🧹 [WorkerService] Cleaning up...');

    // Clean up event subscriptions
    cleanupEventSubscriptions(this);

    // Stop performance monitoring
    if (this.performanceMonitoringInterval) {
      this.timerService.clearInterval(this.performanceMonitoringInterval);
      this.performanceMonitoringInterval = undefined;
    }

    // Terminate worker
    if (this.worker) {
      try {
        this.sendToWorker({
          type: 'TERMINATE',
          timestamp: performance.now(),
        });
        this.worker.terminate();
      } catch (error) {
        this.logger.error('Error terminating worker', error as Record<string, unknown>);
      }
      this.worker = null;
    }

    // Cleanup fallback if active
    if (this.usingFallback && this.fallbackService) {
      this.fallbackService.cleanup();
    }

    this.workerStatus = 'terminated';
    this.logger.info('✅ [WorkerService] Cleanup complete');
  }

  // ==================== WORKER MANAGEMENT ====================

  /**
   * Create and initialize the Web Worker.
   */
  private async createWorker(): Promise<void> {
    this.logger.info('👷 [WorkerService] Creating worker...');
    this.workerStatus = 'initializing';

    try {
      // Create worker using Vite's worker import syntax
      this.worker = new Worker(
        new URL('../workers/QualiaCalculatorWorker.ts', import.meta.url),
        { type: 'module' }
      );

      this.workerCreatedAt = performance.now();

      // Set up worker message handler
      this.worker.onmessage = (event: MessageEvent<WorkerOutputMessage>) => {
        this.handleWorkerMessage(event.data);
      };

      // Set up worker error handler
      this.worker.onerror = (event: ErrorEvent) => {
        this.handleWorkerError(event);
      };

      // Initialize the worker with configuration
      const worker = this.worker; // Capture reference to satisfy type checker
      if (!worker) {
        throw new Error('[QualiaCalculatorWorkerService] Worker creation failed');
      }

      const initPromise = new Promise<void>((resolve, reject) => {
        const timeout = this.timerService.setTimeout(() => {
          reject(new Error('Worker initialization timeout'));
        }, this.workerConfig.initializationTimeout);

        const tempHandler = (event: MessageEvent<WorkerOutputMessage>) => {
          if (event.data.type === 'INITIALIZED') {
            this.timerService.clearTimeout(timeout);
            worker.removeEventListener('message', tempHandler);
            resolve();
          } else if (event.data.type === 'ERROR') {
            this.timerService.clearTimeout(timeout);
            worker.removeEventListener('message', tempHandler);
            reject(new Error(event.data.error));
          }
        };

        worker.addEventListener('message', tempHandler);
      });

      // Send initialization message
      this.sendToWorker({
        type: 'INIT',
        config: this.calculatorConfig,
        initialState: this.currentState,
        timestamp: performance.now(),
      });

      // Wait for initialization
      await initPromise;

      this.workerStatus = 'ready';
      this.consecutiveErrors = 0;
      this.lastSuccessfulOperation = performance.now();
      this.logger.info('✅ [WorkerService] Worker created and initialized');
    } catch (error) {
      this.workerStatus = 'error';
      this.lastError = error instanceof Error ? error.message : String(error);
      this.logger.error('❌ [WorkerService] Worker creation failed', error as Record<string, unknown>);
      throw error;
    }
  }

  /**
   * Recreate the worker.
   */
  @logMethod
  @catchError
  public async recreateWorker(): Promise<void> {
    this.logger.info('🔄 [WorkerService] Recreating worker...');

    // Terminate existing worker
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch (error) {
        this.logger.error('Error terminating old worker', error as Record<string, unknown>);
      }
      this.worker = null;
    }

    // Create new worker
    try {
      await this.createWorker();
      this.workerRecreations++;
      this.logger.info('✅ [WorkerService] Worker recreated successfully');
    } catch (error) {
      this.logger.error('❌ [WorkerService] Worker recreation failed', error as Record<string, unknown>);
      throw error;
    }
  }

  /**
   * Activate fallback to main thread service.
   */
  private async activateFallback(): Promise<void> {
    this.logger.warn('⚠️ [WorkerService] Activating fallback to main thread');

    this.usingFallback = true;
    this.fallbackActivations++;

    // Initialize fallback service if not already initialized
    if (this.fallbackService) {
      this.fallbackService.initialize();
    }

    this.logger.info('✅ [WorkerService] Fallback activated');
  }

  // ==================== MESSAGE HANDLING ====================

  /**
   * Handle messages from the worker.
   */
  private handleWorkerMessage(message: WorkerOutputMessage): void {
    if (this.workerConfig.debugLogging) {
      this.logger.debug('[WorkerService] Received message from worker', { type: message.type });
    }

    // Handle state calculated messages
    if (isStateCalculatedMessage(message)) {
      this.currentState = message.state;
      this.lastSuccessfulOperation = performance.now();
      this.consecutiveErrors = 0;

      // Emit to EventBus
      this.eventBus.emit<QualiaStateCalculatedEvent>({
        type: "QualiaStateCalculated",
        qualiaState: message.state,
      });

      return;
    }

    // Handle log messages from worker
    if (isLogMessage(message)) {
      switch (message.level) {
        case 'debug':
          this.logger.debug(`[Worker] ${message.message}`, message.data);
          break;
        case 'info':
          this.logger.info(`[Worker] ${message.message}`, message.data);
          break;
        case 'warn':
          this.logger.warn(`[Worker] ${message.message}`, message.data);
          break;
        case 'error':
          this.logger.error(`[Worker] ${message.message}`, message.data);
          break;
      }
      return;
    }

    // Handle error messages from worker
    if (isErrorMessage(message)) {
      this.handleWorkerErrorMessage(message);
      return;
    }

    // Handle other message types
    switch (message.type) {
      case 'STATE_RESPONSE':
        this.currentState = message.state;
        break;
      case 'STATS_RESPONSE':
        // Stats are typically requested synchronously, so we don't need to handle them here
        break;
      case 'TERMINATED':
        this.logger.info('[WorkerService] Worker terminated');
        this.workerStatus = 'terminated';
        break;
      default:
        this.logger.warn('[WorkerService] Unknown message type from worker', { message });
    }
  }

  /**
   * Handle worker errors.
   */
  private handleWorkerError(event: ErrorEvent): void {
    this.logger.error('[WorkerService] Worker error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });

    this.consecutiveErrors++;
    this.lastError = event.message;
    this.workerStatus = 'error';

    // Check if we should activate fallback
    if (this.consecutiveErrors >= this.workerConfig.errorThreshold) {
      this.logger.error(
        `[WorkerService] Error threshold reached (${this.consecutiveErrors}), activating fallback`
      );
      this.activateFallback().catch((err) => {
        this.logger.error('[WorkerService] Failed to activate fallback', err);
      });
    }

    // Auto-recreate if enabled
    if (this.workerConfig.autoRecreateOnError && !this.usingFallback) {
      this.logger.info('[WorkerService] Auto-recreating worker after error');
      this.recreateWorker().catch((err) => {
        this.logger.error('[WorkerService] Failed to recreate worker', err);
        this.activateFallback().catch((fallbackErr) => {
          this.logger.error('[WorkerService] Failed to activate fallback', fallbackErr);
        });
      });
    }
  }

  /**
   * Handle error messages from worker.
   */
  private handleWorkerErrorMessage(message: WorkerOutputMessage): void {
    if (message.type !== 'ERROR') return;

    this.logger.error('[WorkerService] Error from worker', {
      error: message.error,
      stack: message.stack,
      context: message.context,
    });

    this.consecutiveErrors++;
    this.lastError = message.error;

    // Check error threshold
    if (this.consecutiveErrors >= this.workerConfig.errorThreshold) {
      this.logger.error(
        `[WorkerService] Error threshold reached (${this.consecutiveErrors}), activating fallback`
      );
      this.activateFallback().catch((err) => {
        this.logger.error('[WorkerService] Failed to activate fallback', err);
      });
    }
  }

  /**
   * Send a message to the worker.
   */
  private sendToWorker(message: WorkerInputMessage): void {
    if (!this.worker) {
      throw new Error('Worker not created');
    }

    if (this.workerStatus !== 'ready' && message.type !== 'INIT') {
      throw new Error(`Worker not ready (status: ${this.workerStatus})`);
    }

    try {
      this.worker.postMessage(message);

      if (this.workerConfig.debugLogging) {
        this.logger.debug('[WorkerService] Sent message to worker', { type: message.type });
      }
    } catch (error) {
      this.logger.error('[WorkerService] Failed to send message to worker', error as Record<string, unknown>);
      throw error;
    }
  }

  // ==================== EVENT HANDLERS ====================

  /**
   * Handle PlayerAction events from EventBus.
   * Forwards to worker or fallback.
   */
  @catchError
  @OnEvent('PlayerAction')
  // @ts-expect-error - Method used by @OnEvent decorator
  private handlePlayerAction(event: PlayerActionEvent): void {
    if (this.usingFallback) {
      // Fallback service has its own @OnEvent handler
      return;
    }

    if (!this.worker || this.workerStatus !== 'ready') {
      this.logger.warn('[WorkerService] Worker not ready, skipping PlayerAction event');
      return;
    }

    try {
      this.sendToWorker({
        type: 'PLAYER_ACTION',
        action: event,
        timestamp: performance.now(),
      });
    } catch (error) {
      this.logger.error('[WorkerService] Failed to forward PlayerAction to worker', error as Record<string, unknown>);
    }
  }

  /**
   * Handle GameTick events from EventBus.
   * Forwards to worker or fallback.
   */
  @catchError
  @OnEvent('GameTick')
  // @ts-expect-error - Method used by @OnEvent decorator
  private handleGameTick(event: GameTickEvent): void {
    if (this.usingFallback) {
      // Fallback service has its own @OnEvent handler
      return;
    }

    if (!this.worker || this.workerStatus !== 'ready') {
      return;
    }

    try {
      this.sendToWorker({
        type: 'GAME_TICK',
        deltaTime: event.deltaTime,
        timestamp: performance.now(),
      });
    } catch (error) {
      this.logger.error('[WorkerService] Failed to forward GameTick to worker', error as Record<string, unknown>);
    }
  }

  // ==================== PUBLIC API ====================

  /**
   * Get the current QualiaState.
   */
  @logMethod
  public getCurrentState(): QualiaState {
    if (this.usingFallback) {
      return this.fallbackService.getCurrentState();
    }

    return { ...this.currentState };
  }

  /**
   * Update the worker configuration.
   */
  @logMethod
  @catchError
  public async updateConfig(newConfig: Partial<QualiaCalculatorConfig>): Promise<void> {
    this.calculatorConfig = {
      ...this.calculatorConfig,
      ...newConfig,
    } as QualiaCalculatorConfig;

    if (this.usingFallback) {
      this.fallbackService.updateConfig(this.calculatorConfig);
      return;
    }

    if (!this.worker || this.workerStatus !== 'ready') {
      throw new Error('Worker not ready');
    }

    this.sendToWorker({
      type: 'UPDATE_CONFIG',
      config: newConfig,
      timestamp: performance.now(),
    });
  }

  /**
   * Reset the QualiaState.
   */
  @logMethod
  @catchError
  public async resetState(): Promise<void> {
    if (this.usingFallback) {
      this.fallbackService.resetState();
      return;
    }

    if (!this.worker || this.workerStatus !== 'ready') {
      throw new Error('Worker not ready');
    }

    this.sendToWorker({
      type: 'RESET',
      timestamp: performance.now(),
    });
  }

  /**
   * Get service statistics.
   */
  @logMethod
  public getStats(): WorkerServiceStats {
    const baseStats: WorkerStats = {
      isRunning: this.workerStatus === 'ready',
      calculationsPerformed: 0,
      averageCalculationTime: 0,
      totalCalculationTime: 0,
      messagesReceived: 0,
      messagesSent: 0,
      errors: this.consecutiveErrors,
      uptime: this.workerCreatedAt ? performance.now() - this.workerCreatedAt : 0,
      currentState: this.currentState,
    };

    return {
      ...baseStats,
      workerStatus: this.workerStatus,
      usingFallback: this.usingFallback,
      workerRecreations: this.workerRecreations,
      fallbackActivations: this.fallbackActivations,
      lastError: this.lastError,
      workerCreatedAt: this.workerCreatedAt,
      consecutiveErrors: this.consecutiveErrors,
    };
  }

  /**
   * Get worker health status.
   */
  @logMethod
  public getHealthStatus(): WorkerHealthStatus {
    const now = performance.now();
    const uptime = this.workerCreatedAt ? now - this.workerCreatedAt : 0;
    const issues: string[] = [];

    if (this.consecutiveErrors > 0) {
      issues.push(`${this.consecutiveErrors} consecutive errors`);
    }

    if (this.usingFallback) {
      issues.push('Using fallback (main thread)');
    }

    if (this.workerStatus === 'error') {
      issues.push(`Worker status: ${this.workerStatus}`);
    }

    if (this.lastError) {
      issues.push(`Last error: ${this.lastError}`);
    }

    const isHealthy =
      this.workerStatus === 'ready' &&
      !this.usingFallback &&
      this.consecutiveErrors < this.workerConfig.errorThreshold;

    return {
      isHealthy,
      status: this.workerStatus,
      lastSuccessfulOperation: this.lastSuccessfulOperation,
      consecutiveErrors: this.consecutiveErrors,
      uptime,
      timestamp: now,
      issues,
    };
  }

  /**
   * Check if worker is healthy.
   */
  @logMethod
  public isWorkerHealthy(): boolean {
    return this.getHealthStatus().isHealthy;
  }

  /**
   * Enable or disable the worker.
   */
  @logMethod
  @catchError
  public async setWorkerEnabled(enabled: boolean): Promise<void> {
    this.workerConfig.enabled = enabled;

    if (enabled && this.usingFallback) {
      // Re-enable worker
      this.logger.info('[WorkerService] Re-enabling worker');
      this.usingFallback = false;
      await this.recreateWorker();
    } else if (!enabled && !this.usingFallback) {
      // Disable worker, activate fallback
      this.logger.info('[WorkerService] Disabling worker');
      await this.activateFallback();
      if (this.worker) {
        this.worker.terminate();
        this.worker = null;
      }
    }
  }

  /**
   * Check if using fallback.
   */
  @logMethod
  public isUsingFallback(): boolean {
    return this.usingFallback;
  }

  // ==================== PERFORMANCE MONITORING ====================

  /**
   * Start performance monitoring.
   */
  private startPerformanceMonitoring(): void {
    if (this.performanceMonitoringInterval) {
      return;
    }

    this.performanceMonitoringInterval = this.timerService.setInterval(() => {
      this.performPerformanceCheck();
    }, this.workerConfig.performanceMonitoringInterval);

    this.logger.info('[WorkerService] Performance monitoring started');
  }

  /**
   * Perform a performance check.
   */
  private performPerformanceCheck(): void {
    const health = this.getHealthStatus();

    if (!health.isHealthy) {
      this.logger.warn('[WorkerService] Performance check: Worker unhealthy', { health });
    }

    // Check worker age
    if (
      this.workerConfig.maxWorkerAge > 0 &&
      health.uptime > this.workerConfig.maxWorkerAge
    ) {
      this.logger.info(
        `[WorkerService] Worker exceeded max age (${health.uptime}ms), recreating`
      );
      this.recreateWorker().catch((err) => {
        this.logger.error('[WorkerService] Failed to recreate aged worker', err);
      });
    }
  }
}
