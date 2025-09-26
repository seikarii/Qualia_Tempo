/**
 * QUALIA.CODE v1.1 - INotificationService Interface
 * Complete contract for event-driven notification management with Zustand store bridging.
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

// Service interface
export interface INotificationService {
  start(): void;
  stop(): void;
  showNotification(
    message: string,
    type: NotificationType,
    options?: {
      duration?: number;
      persistent?: boolean;
      actions?: { label: string; action: () => void }[];
    },
  ): string;
  dismissNotification(id: string): void;
  clearAllNotifications(): void;
  hideNotification(id: string): void;
  hideAllNotifications(): void;
  getActiveNotifications(): Notification[];
  updateConfig(newConfig: Partial<NotificationConfig>): void;
  getStatistics(): NotificationStatistics;
  getStatus(): { isRunning: boolean; queueSize: number };
  exportNotificationData(): any;
  isEnabled(): boolean;
}
