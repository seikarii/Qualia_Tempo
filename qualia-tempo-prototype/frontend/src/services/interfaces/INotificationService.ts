/**
 * QUALIA.CODE v1.1 - INotificationService Interface
 * User notification management interface.
 */

export interface INotificationService {
  /**
   * Show a notification to the user.
   * @param message The notification message
   * @param type The type of notification
   * @param options Optional configuration
   * @returns Unique notification ID
   */
  showNotification(
    message: string, 
    type: 'info' | 'success' | 'warning' | 'error',
    options?: {
      duration?: number;
      persistent?: boolean;
      actions?: Array<{ label: string; action: () => void }>;
    }
  ): string;

  /**
   * Hide a specific notification.
   * @param id The unique notification ID
   */
  hideNotification(id: string): void;

  /**
   * Hide all current notifications.
   */
  hideAllNotifications(): void;

  /**
   * Initialize the notification service.
   */
  start(): void;

  /**
   * Stop the notification service and clean up.
   */
  stop(): void;

  /**
   * Get the list of currently active notifications.
   * @returns Array of active notification objects
   */
  getActiveNotifications(): Array<{
    id: string;
    message: string;
    type: string;
    timestamp: Date;
  }>;
}