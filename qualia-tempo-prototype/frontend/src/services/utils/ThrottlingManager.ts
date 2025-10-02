/**
 * QUALIA.CODE v1.1 - ThrottlingManager
 * Rate limiting and throttling logic extracted from NotificationService monolith
 * 
 * Purpose: Manage notification rate limiting with burst detection and cooldown periods
 * Architecture: Standalone utility class for notification throttling logic
 */

import type { ThrottlingConfig } from '../contracts/INotificationService.contracts';
import type { ITimerService } from '../interfaces/ITimerService';
import { injectable, inject } from 'inversify';
import { TYPES } from '../inversify.types';

@injectable()
export class ThrottlingManager {
  private recentNotifications: Date[] = [];
  private burstCount = 0;
  private lastBurstTime = 0;
  private inCooldown = false;

  constructor(
    @inject(TYPES.ThrottlingConfig) private _config: ThrottlingConfig,
    @inject(TYPES.ITimerService) private _timerService: ITimerService
  ) {}

  canProcess(): boolean {
    if (!this._config.enabled) {
      return true;
    }

    const now = this._timerService.now();

    // Clean old notifications
    this.cleanOldNotifications();

    // Check cooldown
    if (
      this.inCooldown &&
      now - this.lastBurstTime < this._config.cooldownPeriod
    ) {
      return false;
    } else if (this.inCooldown) {
      this.inCooldown = false;
      this.burstCount = 0;
    }

    // Check burst limit
    if (this.burstCount >= this._config.burstLimit) {
      this.inCooldown = true;
      this.lastBurstTime = now;
      return false;
    }

    // Check per-second limit
    const secondAgo = now - (this._config.rateLimitWindow ?? 1000);
    const recentCount = this.recentNotifications.filter(
      (time) => time.getTime() > secondAgo,
    ).length;
    if (recentCount >= this._config.maxNotificationsPerSecond) {
      return false;
    }

    // Check per-minute limit
    const minuteAgo = now - (this._config.burstWindow ?? 60000);
    const minuteCount = this.recentNotifications.filter(
      (time) => time.getTime() > minuteAgo,
    ).length;
    if (minuteCount >= this._config.maxNotificationsPerMinute) {
      return false;
    }

    return true;
  }

  recordNotification(): void {
    const now = new Date(this._timerService.now());
    this.recentNotifications.push(now);
    this.burstCount++;
  }

  private cleanOldNotifications(): void {
    const cutoff = this._timerService.now() - (this._config.historyRetention ?? 60000); // Use configured retention
    this.recentNotifications = this.recentNotifications.filter(
      (time) => time.getTime() > cutoff,
    );
  }
}
