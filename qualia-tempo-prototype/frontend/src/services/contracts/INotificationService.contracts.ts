/**
 * QUALIA.CODE v1.1 - NotificationService Contracts
 * Centralized type definitions for notification system
 *
 * Purpose: Single source of truth for all notification-related data structures
 * Architecture: Contract definitions extracted from service implementation for clarity and reusability
 */

import type { IEventBus } from "../interfaces/IEventBus";
import type { ILogger } from "../interfaces/ILogger";
import type { IGameStateStore } from "../interfaces/IGameStateStore";
import type { ITimerService } from "../interfaces/ITimerService";
import type { ThrottlingManager } from "../utils/ThrottlingManager";

// NotificationService Configuration - Migrated from ConfigurationService.ts
export interface NotificationServiceConfig {
  display: {
    enableNotifications: boolean;
    maxVisibleNotifications: number;
    notificationDuration: number;
    enableAnimations: boolean;
    animationDuration: number;
  };
  positioning: {
    position: string;
    offsetX: number;
    offsetY: number;
    zIndex: number;
  };
  styling: {
    enableThemes: boolean;
    defaultTheme: string;
    enableCustomStyling: boolean;
    borderRadius: number;
    shadowEnabled: boolean;
  };
  sound: {
    enableNotificationSounds: boolean;
    defaultSoundVolume: number;
    enableSoundVariations: boolean;
  };
  types: {
    success: { duration: number; soundEnabled: boolean; color: string };
    error: { duration: number; soundEnabled: boolean; color: string };
    warning: { duration: number; soundEnabled: boolean; color: string };
    info: { duration: number; soundEnabled: boolean; color: string };
  };
  queue: {
    enableQueueing: boolean;
    maxQueueSize: number;
    queueProcessingInterval: number;
  };
  accessibility: {
    enableScreenReader: boolean;
    enableHighContrast: boolean;
    enableReducedMotion: boolean;
    enableKeyboardNavigation: boolean;
  };
  performance: {
    enablePooling: boolean;
    maxPoolSize: number;
    enableGarbageCollection: boolean;
    gcInterval: number;
  };
  maxNotifications: number; // Maximum concurrent notifications
  defaultDuration: number; // Default notification display duration
  
  // Additional properties from ExtendedNotificationConfig to eliminate type conflicts  
  maxHistorySize: number;
  defaultTtl: number;
  maxRetries: number;
  storeUpdateThrottleMs: number;
  enablePriorityQueuing: boolean;
  enableThrottling: boolean;
  autoCleanupInterval: number;
  filter: NotificationFilter;
  throttling: ThrottlingConfig;
  enabled: boolean;
}

// QUALIA.CODE v1.1: Constructor Parameter Object
// Consolidates 6 constructor parameters into a single object to comply with IoC limits
export interface NotificationServiceParams {
  eventBus: IEventBus;
  logger: ILogger;
  config: NotificationServiceConfig;
  gameStateStore: IGameStateStore;
  timerService: ITimerService;
  throttlingManager: ThrottlingManager;
}

// Notification types with specific handling
export type NotificationType =
  | "info"
  | "success"
  | "warning"
  | "error"
  | "achievement"
  | "system"
  | "debug";

// Notification priority levels
export type NotificationPriority = "low" | "normal" | "high" | "urgent";

// Base notification interface
export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  timestamp: Date;
  displayed: boolean;
  dismissed: boolean;
  expiresAt?: Date;
}

// Notification configuration
export interface NotificationConfig {
  enabled: boolean;
  maxHistorySize?: number;
  defaultTtl?: number;
  enablePriorityQueuing?: boolean;
  enableThrottling?: boolean;
  storeUpdateThrottleMs?: number;
  autoCleanupInterval?: number;
}

// Notification statistics
export interface NotificationStatistics {
  totalNotifications: number;
  displayedNotifications: number;
  dismissedNotifications: number;
  expiredNotifications: number;
  throttledNotifications: number;
  filteredNotifications: number;
}

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
  rateLimitWindow: number;  // Window for rate limiting (1 second)
  burstWindow: number;      // Window for burst detection (1 minute)
  historyRetention: number; // How long to keep notification history
}

// Type-safe export data interface (replaces any)
export interface NotificationServiceExport {
  notifications: ExtendedNotification[];
  statistics: NotificationStatistics;
  configuration: NotificationServiceConfig;
  metadata: {
    exportTimestamp: Date;
    totalCount: number;
    activeCount: number;
    historyCount: number;
  };
}

// Type-safe log data interface (replaces any)
export interface NotificationLogData {
  notificationId: string;
  type: NotificationType;
  priority: NotificationPriority;
  message: string;
  timestamp: Date;
  source: string;
  metadata?: Record<string, any>;
  processingTime?: number;
}

// Flexible configuration interface for updateConfig (handles test compatibility)
export interface FlexibleNotificationConfig {
  // Core config properties
  enabled?: boolean;
  maxConcurrent?: number;
  defaultDuration?: number;
  
  // Type configuration
  types?: Record<string, boolean>;
  
  // Nested config for test compatibility  
  notifications?: Partial<NotificationServiceConfig> & {
    allowHighPriority?: boolean;
  };
  
  // All other ExtendedNotificationConfig properties
  maxHistorySize?: number;
  defaultTtl?: number;
  maxRetries?: number;
  storeUpdateThrottleMs?: number;
  enablePriorityQueuing?: boolean;
  enableThrottling?: boolean;
  filter?: NotificationFilter;
  throttling?: ThrottlingConfig;
  autoCleanupInterval?: number;
}


