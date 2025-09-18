/**
 * QUALIA.CODE v1.1 - NotificationService
 * Event-driven notification bridge between EventBus and Zustand store with sophisticated configuration.
 *
 * Architecture:
 * - Decoupled architecture with EventBus integration
 * - Zustand store bridging via injected IGameStateStore
 * - Priority-based notification queuing
 * - Advanced filtering and throttling capabilities
 * - Memory-efficient notification history tracking
 * - Configuration-driven behavior for all thresholds
 * - Injectable service with pure DI compliance
 */

import { injectable, inject, unmanaged } from 'inversify';
import { TYPES } from './inversify.types';
import { logMethod, catchError } from '../utils/decorators';
import type { INotificationService, NotificationConfig, Notification, NotificationStatistics } from './interfaces/INotificationService';
import type { IEventBus } from './interfaces/IEventBus';
import type { ILogger } from './interfaces/ILogger';
import type { IConfigurationService } from './interfaces/IConfigurationService';
import type { IGameStateStore } from './interfaces/IGameStateStore';
import type { 
  QualiaStateUpdatedEvent,
  GameStateChangedEvent,
  ErrorEvent,
  BackendSyncEvent
} from './EventBus';

// Notification priority levels
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

// Notification types with specific handling
export type NotificationType = 
  | 'info' 
  | 'success' 
  | 'warning' 
  | 'error' 
  | 'achievement' 
  | 'system' 
  | 'debug';

// Extended notification interface
export interface ExtendedNotification extends Notification {
  id: string;
  timestamp: Date;
  priority: NotificationPriority;
  category: string;
  source: string;
  metadata?: Record<string, any>;
  displayed: boolean;
  dismissed: boolean;
  expiresAt?: Date;
  retryCount: number;
}

// Notification filter configuration
export interface NotificationFilter {
  types: NotificationType[];
  priorities: NotificationPriority[];
  categories: string[];
  sources: string[];
  maxAge: number; // milliseconds
  enabled: boolean;
}

// Throttling configuration
export interface ThrottlingConfig {
  maxNotificationsPerSecond: number;
  maxNotificationsPerMinute: number;
  burstLimit: number;
  cooldownPeriod: number;
  enabled: boolean;
}

// Extended configuration interface for NotificationService
export interface ExtendedNotificationConfig extends NotificationConfig {
  maxHistorySize: number;
  defaultTtl: number;
  maxRetries: number;
  storeUpdateThrottleMs: number;
  enablePriorityQueuing: boolean;
  enableThrottling: boolean;
  filter: NotificationFilter;
  throttling: ThrottlingConfig;
  autoCleanupInterval: number;
}

// Default configuration
const DEFAULT_NOTIFICATION_CONFIG: ExtendedNotificationConfig = {
  enabled: true,
  maxHistorySize: 1000,
  defaultTtl: 30000, // 30 seconds
  maxRetries: 3,
  storeUpdateThrottleMs: 100,
  enablePriorityQueuing: true,
  enableThrottling: true,
  filter: {
    types: ['info', 'success', 'warning', 'error', 'achievement', 'system'],
    priorities: ['low', 'normal', 'high', 'urgent'],
    categories: [],
    sources: [],
    maxAge: 300000, // 5 minutes
    enabled: false
  },
  throttling: {
    maxNotificationsPerSecond: 5,
    maxNotificationsPerMinute: 50,
    burstLimit: 10,
    cooldownPeriod: 1000,
    enabled: true
  },
  autoCleanupInterval: 60000 // 1 minute
};

// Notification queue with priority handling
export class NotificationQueue {
  private queues: Map<NotificationPriority, ExtendedNotification[]>;
  private priorities: NotificationPriority[] = ['urgent', 'high', 'normal', 'low'];

  constructor() {
    this.queues = new Map();
    this.priorities.forEach(priority => {
      this.queues.set(priority, []);
    });
  }

  enqueue(notification: ExtendedNotification): void {
    const queue = this.queues.get(notification.priority) || [];
    queue.push(notification);
    this.queues.set(notification.priority, queue);
  }

  dequeue(): ExtendedNotification | null {
    for (const priority of this.priorities) {
      const queue = this.queues.get(priority) || [];
      if (queue.length > 0) {
        return queue.shift() || null;
      }
    }
    return null;
  }

  size(): number {
    return Array.from(this.queues.values())
      .reduce((total, queue) => total + queue.length, 0);
  }

  clear(): void {
    this.queues.forEach(queue => queue.length = 0);
  }

  getByPriority(priority: NotificationPriority): ExtendedNotification[] {
    return [...(this.queues.get(priority) || [])];
  }
}

// Throttling manager for rate limiting notifications
export class ThrottlingManager {
  private recentNotifications: Date[] = [];
  private burstCount = 0;
  private lastBurstTime = 0;
  private inCooldown = false;

  constructor(private config: ThrottlingConfig) {}

  canProcess(): boolean {
    if (!this.config.enabled) {
      return true;
    }

    const now = Date.now();

    // Clean old notifications
    this.cleanOldNotifications();

    // Check cooldown
    if (this.inCooldown && now - this.lastBurstTime < this.config.cooldownPeriod) {
      return false;
    } else if (this.inCooldown) {
      this.inCooldown = false;
      this.burstCount = 0;
    }

    // Check burst limit
    if (this.burstCount >= this.config.burstLimit) {
      this.inCooldown = true;
      this.lastBurstTime = now;
      return false;
    }

    // Check per-second limit
    const secondAgo = now - 1000;
    const recentCount = this.recentNotifications.filter(time => time.getTime() > secondAgo).length;
    if (recentCount >= this.config.maxNotificationsPerSecond) {
      return false;
    }

    // Check per-minute limit
    const minuteAgo = now - 60000;
    const minuteCount = this.recentNotifications.filter(time => time.getTime() > minuteAgo).length;
    if (minuteCount >= this.config.maxNotificationsPerMinute) {
      return false;
    }

    return true;
  }

  recordNotification(): void {
    const now = new Date();
    this.recentNotifications.push(now);
    this.burstCount++;
  }

  private cleanOldNotifications(): void {
    const cutoff = Date.now() - 60000; // Keep 1 minute of history
    this.recentNotifications = this.recentNotifications.filter(
      time => time.getTime() > cutoff
    );
  }
}

// Export types for test compatibility
export type { NotificationConfig, Notification, NotificationStatistics } from './interfaces/INotificationService';

/**
 * QUALIA.CODE v1.1 Compliant NotificationService
 * Event-driven notification bridge with sophisticated queuing and filtering.
 * Now with full InversifyJS dependency injection support and Zustand store bridging.
 */
@injectable()
export class NotificationService implements INotificationService {
  private readonly eventBus: IEventBus;
  private readonly logger: ILogger;
  // Configuration service for future extensibility
  // @ts-ignore - Unused parameter for future configuration features
  private readonly _configService: IConfigurationService;
  private readonly gameStateStore: IGameStateStore;
  private config: ExtendedNotificationConfig;
  private isStarted = false;
  private eventListenerIds: string[] = [];

  // Notification processing state
  private notificationQueue: NotificationQueue;
  private throttlingManager: ThrottlingManager;
  private notificationHistory: ExtendedNotification[] = [];
  private activeNotifications: Map<string, ExtendedNotification> = new Map();

  // Processing intervals
  private queueProcessingInterval: number | null = null;
  private cleanupInterval: number | null = null;
  private storeUpdateThrottleTimeout: number | null = null;

  // Statistics tracking
  private statistics: NotificationStatistics = {
    totalNotifications: 0,
    displayedNotifications: 0,
    dismissedNotifications: 0,
    expiredNotifications: 0,
    throttledNotifications: 0,
    filteredNotifications: 0
  };

  // Store update throttling
  private pendingStoreUpdate = false;

  /**
   * QUALIA.CODE v1.1: Pure Dependency Injection Constructor
   */
  constructor(
    @inject(TYPES.IEventBus) eventBus: IEventBus,
    @inject(TYPES.ILogger) logger: ILogger,
    @inject(TYPES.IConfigurationService) _configService: IConfigurationService,
    @inject(TYPES.IGameStateStore) gameStateStore: IGameStateStore,
    @unmanaged() config?: Partial<ExtendedNotificationConfig>
  ) {
    if (!eventBus) {
      throw new Error(
        "🚨 [NotificationService] EventBus is required for QUALIA.CODE v1.1 compliance",
      );
    }

    if (!gameStateStore) {
      throw new Error(
        "🚨 [NotificationService] GameStateStore is required for decoupled architecture",
      );
    }

    this.eventBus = eventBus;
    this.logger = logger;
    this._configService = _configService;
    this.gameStateStore = gameStateStore;
    this.config = { ...DEFAULT_NOTIFICATION_CONFIG, ...config };

    // Initialize processing components
    this.notificationQueue = new NotificationQueue();
    this.throttlingManager = new ThrottlingManager(this.config.throttling);

    this.logger.info(
      "🔧 [NotificationService] Service initialized with event-driven architecture and Zustand store bridging",
    );
    this.logCurrentConfig();
  }

  /**
   * Start the NotificationService and begin processing notifications.
   */
  @logMethod()
  @catchError()
  public start(): void {
    if (this.isStarted) {
      this.logger.warn("⚠️ [NotificationService] Service already running");
      return;
    }

    if (!this.config.enabled) {
      this.logger.info("⚠️ [NotificationService] Service disabled in configuration");
      return;
    }

    try {
      this.logger.info("🚀 [NotificationService] Starting notification processing...");

      // Subscribe to all relevant events
      this.subscribeToEvents();

      // Start processing intervals
      this.startQueueProcessing();
      this.startAutoCleanup();

      this.isStarted = true;
      this.logger.info("🚀 [NotificationService] Service started - Event-driven notifications active");
    } catch (error) {
      this.logger.error("🚨 [NotificationService] Failed to start service:", { error });
      throw error;
    }
  }

  /**
   * Stop the NotificationService and clean up resources.
   */
  @logMethod()
  @catchError()
  public stop(): void {
    if (!this.isStarted) {
      this.logger.warn("⚠️ [NotificationService] Service not running");
      return;
    }

    try {
      this.logger.info("🛑 [NotificationService] Stopping service...");

      // Process remaining notifications
      this.processRemainingNotifications();

      // Unsubscribe from events
      this.unsubscribeFromEvents();

      // Stop processing intervals
      this.stopAllIntervals();

      // Perform final store update
      this.updateStore();

      this.isStarted = false;
      this.logger.info("🛑 [NotificationService] Service stopped");
    } catch (error) {
      this.logger.error("🚨 [NotificationService] Error stopping service:", { error });
    }
  }

  /**
   * Show a notification manually.
   */
  @logMethod()
  @catchError()
  public showNotification(
    message: string, 
    type: NotificationType = 'info', 
    options?: {
      duration?: number;
      persistent?: boolean;
      actions?: { label: string; action: () => void; }[];
    }
  ): string {
    if (!this.isStarted || !this.config.enabled) {
      return '';
    }

    const notification = this.createNotification(message, type, 'normal', {
      expiresAt: options?.duration ? new Date(Date.now() + options.duration) : undefined
    });
    this.processNotification(notification);
    return notification.id;
  }

  /**
   * Show a notification with priority (internal method).
   */
  @logMethod()
  @catchError()
  public async showNotificationWithPriority(
    message: string, 
    type: NotificationType = 'info', 
    priority: NotificationPriority = 'normal',
    options?: Partial<ExtendedNotification>
  ): Promise<void> {
    if (!this.isStarted || !this.config.enabled) {
      return;
    }

    const notification = this.createNotification(message, type, priority, options);
    await this.processNotification(notification);
  }

  /**
   * Dismiss a notification by ID.
   */
  @logMethod()
  @catchError()
  public dismissNotification(id: string): void {
    const notification = this.activeNotifications.get(id);
    if (notification) {
      notification.dismissed = true;
      this.activeNotifications.delete(id);
      this.statistics.dismissedNotifications++;
      this.scheduleStoreUpdate();
      this.logger.debug("❌ [NotificationService] Notification dismissed", { id });
    }
  }

  /**
   * Clear all active notifications.
   */
  @logMethod()
  @catchError()
  public clearAllNotifications(): void {
    const count = this.activeNotifications.size;
    this.activeNotifications.forEach(notification => {
      notification.dismissed = true;
    });
    this.activeNotifications.clear();
    this.statistics.dismissedNotifications += count;
    this.scheduleStoreUpdate();
    this.logger.info(`🧹 [NotificationService] Cleared ${count} active notifications`);
  }

  /**
   * Hide a notification by ID (alias for dismiss).
   */
  @logMethod()
  @catchError()
  public hideNotification(id: string): void {
    this.dismissNotification(id);
  }

  /**
   * Hide all notifications (alias for clear).
   */
  @logMethod()
  @catchError()
  public hideAllNotifications(): void {
    this.clearAllNotifications();
  }

  /**
   * Get all active notifications.
   */
  @logMethod()
  @catchError()
  public getActiveNotifications(): Notification[] {
    return Array.from(this.activeNotifications.values()).map(notification => ({
      id: notification.id,
      message: notification.message,
      type: notification.type,
      priority: notification.priority,
      timestamp: notification.timestamp,
      displayed: notification.displayed,
      dismissed: notification.dismissed,
      expiresAt: notification.expiresAt
    }));
  }

  /**
   * Get service status.
   */
  @logMethod()
  @catchError()
  public getStatus(): { isRunning: boolean; queueSize: number; } {
    return {
      isRunning: this.isStarted,
      queueSize: this.notificationQueue.size()
    };
  }

  /**
   * Update NotificationService configuration.
   */
  @logMethod()
  @catchError()
  public updateConfig(newConfig: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.throttlingManager = new ThrottlingManager(this.config.throttling);
    this.logger.info("⚙️ [NotificationService] Configuration updated");
    this.logCurrentConfig();

    // Restart intervals if running
    if (this.isStarted) {
      this.stopAllIntervals();
      this.startQueueProcessing();
      this.startAutoCleanup();
    }
  }

  /**
   * Get notification statistics.
   */
  @logMethod()
  @catchError()
  public getStatistics(): NotificationStatistics {
    return { ...this.statistics };
  }

  /**
   * Export notification data for analysis.
   */
  @logMethod()
  @catchError()
  public exportNotificationData(): any {
    return {
      timestamp: Date.now(),
      statistics: this.getStatistics(),
      notificationHistory: this.notificationHistory,
      activeNotifications: Array.from(this.activeNotifications.values()),
      queueSize: this.notificationQueue.size(),
      config: this.config
    };
  }

  /**
   * Check if notifications are currently enabled.
   */
  public isEnabled(): boolean {
    return this.isStarted && this.config.enabled;
  }

  // Private implementation methods

  private subscribeToEvents(): void {
    // Subscribe to specific event types that should trigger notifications
    this.eventListenerIds.push(
      this.eventBus.subscribe('Error', (event: ErrorEvent) => {
        this.handleErrorEvent(event);
      })
    );

    this.eventListenerIds.push(
      this.eventBus.subscribe('GameStateChanged', (event: GameStateChangedEvent) => {
        this.handleGameStateEvent(event);
      })
    );

    this.eventListenerIds.push(
      this.eventBus.subscribe('QualiaStateUpdated', (event: QualiaStateUpdatedEvent) => {
        this.handleQualiaStateEvent(event);
      })
    );

    this.eventListenerIds.push(
      this.eventBus.subscribe('BackendSync', (event: BackendSyncEvent) => {
        this.handleBackendSyncEvent(event);
      })
    );

    this.logger.info("📡 [NotificationService] Subscribed to notification events");
  }

  private unsubscribeFromEvents(): void {
    for (const listenerId of this.eventListenerIds) {
      this.eventBus.unsubscribe(listenerId);
    }
    this.eventListenerIds = [];
    this.logger.info("📡 [NotificationService] Unsubscribed from notification events");
  }

  private handleErrorEvent(event: ErrorEvent): void {
    const priority = event.severity === 'critical' ? 'urgent' : 
                    event.severity === 'high' ? 'high' : 'normal';

    const notification = this.createNotification(
      `Error: ${event.error.message}`,
      'error',
      priority,
      {
        source: 'ErrorEvent',
        category: 'system',
        metadata: {
          severity: event.severity,
          context: event.context
        }
      }
    );

    this.processNotification(notification);
  }

  private handleGameStateEvent(event: GameStateChangedEvent): void {
    const notification = this.createNotification(
      `Game state changed to: ${event.newState}`,
      'info',
      'normal',
      {
        source: 'GameStateEvent',
        category: 'game',
        metadata: {
          oldState: event.oldState,
          newState: event.newState
        }
      }
    );

    this.processNotification(notification);
  }

  private handleQualiaStateEvent(event: QualiaStateUpdatedEvent): void {
    // Only show notifications for significant qualia changes
    const hasSignificantChange = Object.values(event.qualiaState).some(
      value => typeof value === 'number' && (value > 0.8 || value < 0.2)
    );

    if (hasSignificantChange) {
      const notification = this.createNotification(
        'Significant qualia state change detected',
        'achievement',
        'normal',
        {
          source: 'QualiaStateEvent',
          category: 'performance',
          metadata: {
            qualiaState: event.qualiaState
          }
        }
      );

      this.processNotification(notification);
    }
  }

  private handleBackendSyncEvent(event: BackendSyncEvent): void {
    if (event.status === 'error') {
      const notification = this.createNotification(
        'Backend synchronization failed',
        'warning',
        'high',
        {
          source: 'BackendSyncEvent',
          category: 'system',
          metadata: {
            status: event.status,
            error: event.error
          }
        }
      );

      this.processNotification(notification);
    }
  }

  private createNotification(
    message: string,
    type: NotificationType,
    priority: NotificationPriority,
    options?: Partial<ExtendedNotification>
  ): ExtendedNotification {
    const now = new Date();
    return {
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
      timestamp: now,
      message,
      type,
      priority,
      category: options?.category || 'general',
      source: options?.source || 'manual',
      metadata: options?.metadata,
      displayed: false,
      dismissed: false,
      expiresAt: new Date(now.getTime() + (options?.expiresAt?.getTime() || this.config.defaultTtl)),
      retryCount: 0,
      ...options
    };
  }

  private async processNotification(notification: ExtendedNotification): Promise<void> {
    this.statistics.totalNotifications++;

    // Apply filters
    if (this.shouldFilterNotification(notification)) {
      this.statistics.filteredNotifications++;
      return;
    }

    // Check throttling
    if (!this.throttlingManager.canProcess()) {
      this.statistics.throttledNotifications++;
      this.logger.debug("🚦 [NotificationService] Notification throttled", {
        id: notification.id,
        type: notification.type
      });
      return;
    }

    // Record notification for throttling
    this.throttlingManager.recordNotification();

    // Add to queue
    if (this.config.enablePriorityQueuing) {
      this.notificationQueue.enqueue(notification);
    } else {
      // Process immediately
      this.displayNotification(notification);
    }

    // Add to history
    this.notificationHistory.push(notification);
    if (this.notificationHistory.length > this.config.maxHistorySize) {
      this.notificationHistory = this.notificationHistory.slice(-Math.floor(this.config.maxHistorySize * 0.8));
    }

    this.logger.debug("📝 [NotificationService] Notification queued", {
      id: notification.id,
      type: notification.type,
      priority: notification.priority
    });
  }

  private shouldFilterNotification(notification: ExtendedNotification): boolean {
    if (!this.config.filter.enabled) {
      return false;
    }

    const filter = this.config.filter;

    // Check type filter
    if (filter.types.length > 0 && !filter.types.includes(notification.type)) {
      return true;
    }

    // Check priority filter
    if (filter.priorities.length > 0 && !filter.priorities.includes(notification.priority)) {
      return true;
    }

    // Check category filter
    if (filter.categories.length > 0 && !filter.categories.includes(notification.category)) {
      return true;
    }

    // Check source filter
    if (filter.sources.length > 0 && !filter.sources.includes(notification.source)) {
      return true;
    }

    // Check age filter
    const age = Date.now() - notification.timestamp.getTime();
    if (age > filter.maxAge) {
      return true;
    }

    return false;
  }

  private displayNotification(notification: ExtendedNotification): void {
    notification.displayed = true;
    this.activeNotifications.set(notification.id, notification);
    this.statistics.displayedNotifications++;
    this.scheduleStoreUpdate();

    this.logger.info("📢 [NotificationService] Notification displayed", {
      id: notification.id,
      type: notification.type,
      message: notification.message
    });
  }

  private startQueueProcessing(): void {
    this.queueProcessingInterval = window.setInterval(() => {
      this.processQueue();
    }, 100); // Process every 100ms
  }

  private startAutoCleanup(): void {
    this.cleanupInterval = window.setInterval(() => {
      this.performAutoCleanup();
    }, this.config.autoCleanupInterval);
  }

  private stopAllIntervals(): void {
    if (this.queueProcessingInterval) {
      clearInterval(this.queueProcessingInterval);
      this.queueProcessingInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.storeUpdateThrottleTimeout) {
      clearTimeout(this.storeUpdateThrottleTimeout);
      this.storeUpdateThrottleTimeout = null;
    }
  }

  private processQueue(): void {
    while (this.notificationQueue.size() > 0 && this.throttlingManager.canProcess()) {
      const notification = this.notificationQueue.dequeue();
      if (notification) {
        this.throttlingManager.recordNotification();
        this.displayNotification(notification);
      }
    }
  }

  private performAutoCleanup(): void {
    const now = Date.now();
    let expiredCount = 0;

    // Clean up expired notifications
    for (const [id, notification] of this.activeNotifications) {
      if (notification.expiresAt && now > notification.expiresAt.getTime()) {
        notification.dismissed = true;
        this.activeNotifications.delete(id);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      this.statistics.expiredNotifications += expiredCount;
      this.scheduleStoreUpdate();
      this.logger.debug("🧹 [NotificationService] Auto-cleanup removed expired notifications", {
        count: expiredCount
      });
    }
  }

  private scheduleStoreUpdate(): void {
    if (this.pendingStoreUpdate) {
      return;
    }

    this.pendingStoreUpdate = true;
    this.storeUpdateThrottleTimeout = window.setTimeout(() => {
      this.updateStore();
      this.pendingStoreUpdate = false;
    }, this.config.storeUpdateThrottleMs);
  }

  private updateStore(): void {
    try {
      // Update the Zustand store with current notifications
      const notifications = Array.from(this.activeNotifications.values());
      
      // Use the injected store's setter method
      this.gameStateStore.setNotifications(notifications);

      this.logger.debug("🔄 [NotificationService] Store updated with notifications", {
        count: notifications.length
      });
    } catch (error) {
      this.logger.error("🚨 [NotificationService] Failed to update store:", { error });
    }
  }

  private processRemainingNotifications(): void {
    const queueSize = this.notificationQueue.size();
    if (queueSize > 0) {
      this.logger.info(`🔄 [NotificationService] Processing ${queueSize} remaining notifications...`);
      
      // Process all remaining notifications without throttling
      while (this.notificationQueue.size() > 0) {
        const notification = this.notificationQueue.dequeue();
        if (notification) {
          this.displayNotification(notification);
        }
      }
    }
  }

  private logCurrentConfig(): void {
    this.logger.info("📊 [NotificationService] Current Configuration:", {
      enabled: this.config.enabled,
      maxHistorySize: this.config.maxHistorySize,
      defaultTtl: `${this.config.defaultTtl}ms`,
      enablePriorityQueuing: this.config.enablePriorityQueuing,
      enableThrottling: this.config.enableThrottling,
      throttlingMaxPerSecond: this.config.throttling.maxNotificationsPerSecond,
      throttlingMaxPerMinute: this.config.throttling.maxNotificationsPerMinute,
      filterEnabled: this.config.filter.enabled,
      storeUpdateThrottleMs: this.config.storeUpdateThrottleMs
    });
  }
}
