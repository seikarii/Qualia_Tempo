/**
 * @generated DO NOT EDIT
 * QUALIA.CODE v1.1 - NotificationService Contracts
 * Centralized type definitions for notification system
 *
 * Purpose: Single source of truth for all notification-related data structures
 * Architecture: Contract definitions extracted from service implementation for clarity and reusability
 */

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

// Type-safe export data interface (replaces any)
export interface NotificationServiceExport {
  notifications: ExtendedNotification[];
  statistics: NotificationStatistics;
  configuration: ExtendedNotificationConfig;
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
  notifications?: Partial<ExtendedNotificationConfig> & {
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


