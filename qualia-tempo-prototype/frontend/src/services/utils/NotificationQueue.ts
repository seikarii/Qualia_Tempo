/**
 * QUALIA.CODE v1.1 - NotificationQueue
 * Priority-based notification queue extracted from NotificationService monolith
 * 
 * Purpose: Manage notifications by priority levels with FIFO ordering within each priority
 * Architecture: Standalone utility class for notification queuing logic
 */

import type { ExtendedNotification, NotificationPriority } from '../contracts/INotificationService.contracts';

export class NotificationQueue {
  private queues: Map<NotificationPriority, ExtendedNotification[]>;
  private priorities: NotificationPriority[] = [
    "urgent",
    "high", 
    "normal",
    "low",
  ];

  constructor() {
    this.queues = new Map();
    this.priorities.forEach((priority) => {
      this.queues.set(priority, []);
    });
  }

  enqueue(notification: ExtendedNotification): void {
    const queue = this.queues.get(notification.priority) ?? [];
    queue.push(notification);
    this.queues.set(notification.priority, queue);
  }

  dequeue(): ExtendedNotification | null {
    for (const priority of this.priorities) {
      const queue = this.queues.get(priority) ?? [];
      if (queue.length > 0) {
        return queue.shift() ?? null;
      }
    }
    return null;
  }

  size(): number {
    return Array.from(this.queues.values()).reduce(
      (total, queue) => total + queue.length,
      0,
    );
  }

  clear(): void {
    this.queues.forEach((queue) => (queue.length = 0));
  }

  getByPriority(priority: NotificationPriority): ExtendedNotification[] {
    return [...(this.queues.get(priority) ?? [])];
  }
}
