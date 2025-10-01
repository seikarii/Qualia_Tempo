/**
 * QUALIA.CODE v1.1 - INotificationService Interface
 * Complete contract for event-driven notification management with Zustand store bridging.
 */

import type {
  NotificationType,
  Notification,
  NotificationStatistics,
  NotificationServiceConfig,
  NotificationServiceExport,
} from '../contracts/INotificationService.contracts';

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
  // Compatibility method for tests
  show(
    message: string,
    type?: NotificationType,
    duration?: number,
    metadata?: Record<string, unknown>
  ): string;
  dismissNotification(id: string): void;
  clearAllNotifications(): void;
  hideNotification(id: string): void;
  hideAllNotifications(): void;
  getActiveNotifications(): Notification[];
  // QUALIA.CODE v1.1: Unified configuration schema
  updateConfig(newConfig: Partial<NotificationServiceConfig>): void;
  getStatistics(): NotificationStatistics;
  getStatus(): { isRunning: boolean; queueSize: number };
  exportNotificationData(): NotificationServiceExport;
  isEnabled(): boolean;
}
