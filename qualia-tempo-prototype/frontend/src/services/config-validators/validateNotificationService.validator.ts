/**
 * QUALIA.CODE v1.1 - NotificationService Configuration Validator
 * Modular validation for NotificationService configuration section.
 */

import type { NotificationServiceConfig } from '../contracts/INotificationService.contracts';

/**
 * Validate NotificationService configuration section.
 * @param config - NotificationService configuration to validate
 * @throws Error if configuration is invalid
 */
export function validateNotificationServiceConfig(config: Partial<NotificationServiceConfig> | undefined): void {
  if (typeof config?.display?.enableNotifications !== 'boolean') {
    throw new Error('Invalid notificationService.display.enableNotifications configuration: must be boolean');
  }
  
  if (typeof config?.display?.maxVisibleNotifications !== 'number' || config.display.maxVisibleNotifications <= 0) {
    throw new Error('Invalid notificationService.display.maxVisibleNotifications configuration: must be positive number');
  }
  
  if (typeof config?.display?.notificationDuration !== 'number' || config.display.notificationDuration <= 0) {
    throw new Error('Invalid notificationService.display.notificationDuration configuration: must be positive number');
  }
  
  if (typeof config?.maxNotifications !== 'number' || config.maxNotifications <= 0) {
    throw new Error('Invalid notificationService.maxNotifications configuration: must be positive number');
  }
  
  if (typeof config?.defaultDuration !== 'number' || config.defaultDuration <= 0) {
    throw new Error('Invalid notificationService.defaultDuration configuration: must be positive number');
  }
}