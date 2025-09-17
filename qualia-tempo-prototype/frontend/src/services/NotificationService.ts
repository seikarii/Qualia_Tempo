/**
 * QUALIA.CODE v1.0 - NotificationService
 * Service responsible for bridging business logic events to UI notifications.
 *
 * Architecture:
 * - Event-driven notification generation
 * - Decoupled from UI components via Zustand store
 * - Type-safe notification management
 * - Configurable notification behavior
 */

import { EventBus, ErrorEvent, BackendSyncEvent } from "./EventBus";
import { logMethod, catchError } from '../utils/decorators';
import { QualiaLogger } from './Logger';
import { ConfigurationService } from './ConfigurationService';
import { Notification } from '../state/useGameStore';

// Store setter type (from Zustand)
type StoreSetter = (_state: any) => void;

/**
 * NotificationService: Bridge between EventBus and UI Notifications
 *
 * QUALIA.CODE Compliance:
 * - Single responsibility: Event-to-notification translation
 * - Dependency injection: Receives EventBus and store setter
 * - Event-driven: Reacts to events, doesn't emit them
 * - Decoupled: No direct UI component knowledge
 */
export class NotificationService {
  private readonly eventBus: EventBus;
  private readonly setStore: StoreSetter;
  private readonly logger: QualiaLogger;
  private readonly configService: ConfigurationService;
  private isStarted = false;
  private listenerIds: string[] = [];

  constructor(
    eventBus: EventBus,
    logger: QualiaLogger,
    setStore: StoreSetter,
    configService: ConfigurationService
  ) {
    this.eventBus = eventBus;
    this.logger = logger;
    this.setStore = setStore;
    this.configService = configService;
    // Note: Configuration access deferred to start() method to avoid circular dependency
    this.logger.info("🔔 [NotificationService] Service constructor completed - awaiting configuration load");
  }

  /**
   * Get logging configuration safely, with fallback messages
   */
  private getLoggingMessage(path: string, fallback: string): string {
    try {
      const config = this.configService.getConfig().debugService.logging;
      const pathArray = path.split('.');
      let current: any = config;
      
      for (const segment of pathArray) {
        current = current?.[segment];
      }
      
      return current || fallback;
    } catch (error) {
      // Configuration not loaded yet - use fallback
      return fallback;
    }
  }

  /**
   * Start listening to events and generating notifications
   */
  @logMethod()
  @catchError()
  start(): void {
    if (this.isStarted) {
      this.logger.warn(this.getLoggingMessage(
        'messages.notificationService.alreadyStarted',
        '⚠️ [NotificationService] Already started'
      ));
      return;
    }

    this.logger.info(this.getLoggingMessage(
      'messages.notificationService.startingListeners',
      '🔔 [NotificationService] Starting event listeners'
    ));

    // Subscribe to ErrorEvent
    const errorListenerId = this.eventBus.subscribe(
      "Error",
      this.handleErrorEvent.bind(this),
    );
    this.listenerIds.push(errorListenerId);

    // Subscribe to BackendSyncEvent
    const backendSyncListenerId = this.eventBus.subscribe(
      "BackendSync",
      this.handleBackendSyncEvent.bind(this),
    );
    this.listenerIds.push(backendSyncListenerId);

    this.isStarted = true;
    this.logger.info(this.getLoggingMessage(
      'messages.notificationService.listenersActive',
      '✅ [NotificationService] Event listeners active'
    ));
  }

  /**
   * Stop listening to events
   */
  @logMethod()
  @catchError()
  stop(): void {
    if (!this.isStarted) {
      this.logger.warn(this.getLoggingMessage(
        'messages.notificationService.notStarted',
        '⚠️ [NotificationService] Service not started'
      ));
      return;
    }

    this.logger.info(this.getLoggingMessage(
      'messages.notificationService.stoppingListeners',
      '🔔 [NotificationService] Stopping event listeners'
    ));

    // Unsubscribe from all events
    this.listenerIds.forEach((listenerId) => {
      this.eventBus.unsubscribe(listenerId);
    });
    this.listenerIds = [];

    this.isStarted = false;
    this.logger.info(this.getLoggingMessage(
      'messages.notificationService.listenersStopped',
      '✅ [NotificationService] Event listeners stopped'
    ));
  }

  /**
   * Handle ErrorEvent - Generate notifications for high/critical errors
   */
  private handleErrorEvent(event: ErrorEvent): void {
    this.logger.info(
      this.getLoggingMessage(
        'messages.notificationService.processingErrorEvent',
        '🔔 [NotificationService] Processing error event'
      ),
      { severity: event.severity, error: event.error.message },
    );

    // Only show notifications for high or critical severity
    if (event.severity === "high" || event.severity === "critical") {
      const notification: Notification = {
        id: `error-${Date.now()}-${Math.random()}`,
        type: "error",
        title: "Error",
        message: event.error.message,
        timestamp: Date.now(),
        autoHide: true,
        duration: 5000, // 5 seconds
      };

      this.addNotification(notification);
      this.logger.info(this.getLoggingMessage(
        'messages.notificationService.errorNotificationGenerated',
        '✅ [NotificationService] Error notification generated'
      ));
    }
  }

  /**
   * Handle BackendSyncEvent - Generate notifications for successful config sync
   */
  private handleBackendSyncEvent(event: BackendSyncEvent): void {
    this.logger.info(
      this.getLoggingMessage(
        'messages.notificationService.processingBackendSyncEvent',
        '🔔 [NotificationService] Processing backend sync event'
      ),
      { syncType: event.syncType },
    );

    // Show notification for successful config sync
    if (event.syncType === "config") {
      const notification: Notification = {
        id: `config-sync-${Date.now()}-${Math.random()}`,
        type: "success",
        title: "Configuration Updated",
        message: "Configuration has been synchronized successfully",
        timestamp: Date.now(),
        autoHide: true,
        duration: 3000, // 3 seconds
      };

      this.addNotification(notification);
      this.logger.info(this.getLoggingMessage(
        'messages.notificationService.configSyncNotificationGenerated',
        '✅ [NotificationService] Config sync notification generated'
      ));
    }
  }

  /**
   * Add notification to the store
   */
  private addNotification(notification: Notification): void {
    this.setStore((state: any) => ({
      ...state,
      notifications: [...state.notifications, notification],
    }));
  }

  /**
   * Get service status
   */
  @logMethod()
  @catchError()
  getStatus(): "stopped" | "running" {
    return this.isStarted ? "running" : "stopped";
  }
}