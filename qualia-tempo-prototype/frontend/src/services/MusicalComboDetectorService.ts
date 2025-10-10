/**
 * MusicalComboDetectorService
 * Musical key sequence detection and combo pattern validation
 * 
 * ARCHITECTURE: Event-driven service with Direct Configuration Injection
 * - Detects musical combo patterns from player input (Q-E-R-T-F-G-C keys)
 * - Validates sequences against harmony data
 * - Emits ComboDetectedEvent for valid combos
 * - Tracks cooldowns and sequence timing
 * 
 * QUALIA.CODE COMPLIANCE:
 * - @injectable() decorator for IoC
 * - @inject() for all dependencies
 * - Direct Configuration Injection (no IConfigurationService)
 * - @logMethod on all public methods
 * - @catchError on complex operations
 * - Platform abstraction (ITimerService for setTimeout/setInterval)
 * - Event-driven communication (IEventBus)
 * - IBaseService lifecycle pattern
 */

import { injectable, inject } from 'inversify';
import { TYPES } from './inversify.types';
import { IMusicalComboDetectorService } from './interfaces/IMusicalComboDetectorService';
import type {
  MusicalComboDetectorServiceConfig,
  MusicalComboDetectorServiceParams,
  ComboPattern,
  ActiveCombo,
  MusicalSequence,
  ComboDetectionResult,
} from './contracts/IMusicalComboDetectorService.contracts';
import { logMethod, catchError, OnEvent, initializeEventSubscriptions, cleanupEventSubscriptions } from '../utils/decorators';
import type { IEventBus } from './interfaces/IEventBus';
import type { ILogger } from './interfaces/ILogger';
import type { ITimerService } from './interfaces/ITimerService';
import type { IBaseService } from './interfaces/IBaseService';
import type {
  ComboDetectedEvent,
  ComboExpiredEvent,
  SequenceClearedEvent,
  KeyPressedEvent,
} from './contracts/events.contracts';

@injectable()
export class MusicalComboDetectorService implements IMusicalComboDetectorService, IBaseService {
  private readonly config: MusicalComboDetectorServiceConfig;
  private readonly eventBus: IEventBus;
  private readonly logger: ILogger;
  private readonly timerService: ITimerService;

  // State
  private _isInitialized: boolean = false;
  private _currentSequence: MusicalSequence | null = null;
  private _activeCombos: Map<string, ActiveCombo> = new Map();
  private _lastComboTime: number = 0;
  private _sequenceTimeoutHandle: number | null = null;
  private _patterns: Map<string, ComboPattern> = new Map();

  // Lifecycle
  public _eventListeners: string[] = [];

  constructor(
    @inject(TYPES.MusicalComboDetectorServiceParams) params: MusicalComboDetectorServiceParams
  ) {
    this.config = params.config;
    this.eventBus = params.eventBus;
    this.logger = params.logger;
    this.timerService = params.timerService;

    // Build pattern lookup map
    this.buildPatternMap();
  }

  /**
   * Build pattern lookup map for efficient combo detection
   */
  private buildPatternMap(): void {
    this._patterns.clear();
    
    for (const pattern of this.config.patterns) {
      // Create a key from sorted keys for pattern matching
      const patternKey = this.createPatternKey(pattern.keys);
      this._patterns.set(patternKey, pattern);
    }
  }

  /**
   * Create a pattern key from key sequence
   * Normalizes keys to uppercase and sorts them for consistent matching
   */
  private createPatternKey(keys: string[]): string {
    return keys.map(k => k.toUpperCase()).join('+');
  }

  /**
   * Initialize service
   */
  @logMethod
  @catchError
  public initialize(): void {
    if (this._isInitialized) {
      this.logger.warn('MusicalComboDetectorService already initialized');
      return;
    }

    if (!this.config.enabled) {
      this.logger.info('MusicalComboDetectorService disabled by configuration');
      return;
    }

    this._isInitialized = true;

    // PHASE 4 INTEGRATION: Subscribe to KeyPressed events
    initializeEventSubscriptions(this);

    const message = this.config.logMessages.serviceInitialized
      .replace('{patternCount}', this.config.patterns.length.toString());
    this.logger.info(message);
  }

  /**
   * Cleanup service resources
   */
  @logMethod
  @catchError
  public cleanup(): void {
    // PHASE 4 INTEGRATION: Unsubscribe from events
    cleanupEventSubscriptions(this);
    
    this.clearSequenceTimeout();
    this._currentSequence = null;
    this._activeCombos.clear();
    this._isInitialized = false;
    this.logger.info('MusicalComboDetectorService cleaned up');
  }

  /**
   * PHASE 4 INTEGRATION: Event handler for KeyPressed events
   * Receives musical key presses from GameInputControllerService
   */
  @OnEvent('Input.KeyPressed')
  // @ts-expect-error - Used by @OnEvent decorator but TypeScript cannot detect it
  private handleKeyPress(event: KeyPressedEvent): void {
    this.recordKeyPress(event.key);
  }

  /**
   * Record a key press in the sequence
   * @param key - Musical key (Q, E, R, T, F, G, C)
   */
  @logMethod
  @catchError
  public recordKeyPress(key: string): void {
    if (!this._isInitialized || !this.config.enabled) {
      return;
    }

    const normalizedKey = key.toUpperCase();
    const validKeys = ['Q', 'E', 'R', 'T', 'F', 'G', 'C'];
    
    if (!validKeys.includes(normalizedKey)) {
      this.logger.warn(`Invalid musical key: ${key}`);
      return;
    }

    const now = Date.now();

    // Check global cooldown
    if (now - this._lastComboTime < this.config.globalCooldown) {
      const remaining = this.config.globalCooldown - (now - this._lastComboTime);
      this.logger.debug(`Global cooldown active (${remaining}ms remaining)`);
      return;
    }

    // Update or initialize sequence
    this.updateSequence(normalizedKey, now);

    // Attempt combo detection after each key press
    this.attemptComboDetection();
  }

  /**
   * Update sequence with new key press
   */
  private updateSequence(normalizedKey: string, now: number): void {
    // Initialize or extend sequence
    if (!this._currentSequence) {
      this._currentSequence = {
        keys: [normalizedKey],
        timestamp: now,
        lastKeyTime: now,
        isValid: true,
      };
      this.startSequenceTimeout();
    } else {
      // Check if sequence timed out
      if (now - this._currentSequence.lastKeyTime > this.config.sequenceTimeout) {
        this._clearSequence('timeout');
        this._currentSequence = {
          keys: [normalizedKey],
          timestamp: now,
          lastKeyTime: now,
          isValid: true,
        };
        this.startSequenceTimeout();
      } else {
        // Add key to existing sequence
        this._currentSequence.keys.push(normalizedKey);
        this._currentSequence.lastKeyTime = now;

        // Check if sequence exceeds max length
        if (this._currentSequence.keys.length > this.config.maxSequenceLength) {
          this.logger.debug('Sequence exceeded max length, clearing');
          this._clearSequence('manual');
        }
      }
    }
  }

  /**
   * Attempt to detect and activate a combo from current sequence
   */
  private attemptComboDetection(): void {
    if (!this._currentSequence || this._currentSequence.keys.length < this.config.minSequenceLength) {
      return;
    }

    const result = this.detectCombo(this._currentSequence.keys);

    if (result.matched && result.pattern) {
      this.activateCombo(result.pattern, result.harmonicScore ?? result.pattern.harmonicScore);
    }
  }

  /**
   * Detect combo pattern from key sequence
   */
  private detectCombo(keys: string[]): ComboDetectionResult {
    const patternKey = this.createPatternKey(keys);
    const pattern = this._patterns.get(patternKey);

    if (!pattern) {
      return { matched: false };
    }

    // Check if combo is on cooldown
    const activeCombo = this._activeCombos.get(pattern.id);
    if (activeCombo) {
      const now = Date.now();
      if (now < activeCombo.cooldownEndsAt) {
        const remaining = activeCombo.cooldownEndsAt - now;
        const message = this.config.logMessages.cooldownActive
          .replace('{comboId}', pattern.id)
          .replace('{remainingMs}', remaining.toString());
        this.logger.debug(message);
        return { matched: false };
      }
    }

    // Pattern matched and not on cooldown
    const finalScore = pattern.harmonicScore;

    // Apply contextual analysis if enabled
    if (this.config.contextualAnalysis) {
      // TODO: Integrate with HarmonyAnalysisService for context-based modifiers
      // For now, use base harmonic score
    }

    return {
      matched: true,
      pattern,
      harmonicScore: finalScore,
    };
  }

  /**
   * Activate a detected combo
   */
  private activateCombo(pattern: ComboPattern, harmonicScore: number): void {
    const now = Date.now();

    const activeCombo: ActiveCombo = {
      pattern,
      activatedAt: now,
      expiresAt: now + pattern.cooldown, // Combos expire after cooldown duration
      cooldownEndsAt: now + pattern.cooldown,
    };

    this._activeCombos.set(pattern.id, activeCombo);
    this._lastComboTime = now;

    // Emit combo detected event
    if (this.config.emitEvents) {
      const event: ComboDetectedEvent = {
        type: 'Combo.Detected',
        comboId: pattern.id,
        comboType: pattern.type,
        effect: pattern.effect,
        harmonicScore,
        keys: [...(this._currentSequence?.keys ?? [])],
        timestamp: new Date(),
        source: 'MusicalComboDetectorService',
      };
      this.eventBus.emit(event);
    }

    const message = this.config.logMessages.comboDetected
      .replace('{comboId}', pattern.id)
      .replace('{comboType}', pattern.type)
      .replace('{harmonicScore}', harmonicScore.toFixed(2));
    this.logger.info(message);

    // Clear sequence after successful combo
    this._clearSequence('combo-activated');

    // Schedule combo expiration
    this.scheduleComboExpiration(pattern.id, pattern.cooldown);
  }

  /**
   * Schedule combo expiration
   */
  private scheduleComboExpiration(comboId: string, duration: number): void {
    this.timerService.setTimeout(() => {
      this.expireCombo(comboId);
    }, duration);
  }

  /**
   * Expire an active combo
   */
  private expireCombo(comboId: string): void {
    const activeCombo = this._activeCombos.get(comboId);
    if (!activeCombo) {
      return;
    }

    this._activeCombos.delete(comboId);

    if (this.config.emitEvents) {
      const event: ComboExpiredEvent = {
        type: 'Combo.Expired',
        comboId,
        timestamp: new Date(),
        source: 'MusicalComboDetectorService',
      };
      this.eventBus.emit(event);
    }

    const message = this.config.logMessages.comboExpired
      .replace('{comboId}', comboId);
    this.logger.info(message);
  }

  /**
   * Start sequence timeout timer
   */
  private startSequenceTimeout(): void {
    this.clearSequenceTimeout();
    
    this._sequenceTimeoutHandle = this.timerService.setTimeout(() => {
      this._clearSequence('timeout');
    }, this.config.sequenceTimeout);
  }

  /**
   * Clear sequence timeout timer
   */
  private clearSequenceTimeout(): void {
    if (this._sequenceTimeoutHandle !== null) {
      this.timerService.clearTimeout(this._sequenceTimeoutHandle);
      this._sequenceTimeoutHandle = null;
    }
  }

  /**
   * Clear current sequence
   */
  private _clearSequence(reason: 'timeout' | 'manual' | 'combo-activated'): void {
    if (!this._currentSequence) {
      return;
    }

    this._currentSequence = null;
    this.clearSequenceTimeout();

    if (this.config.emitEvents && reason !== 'combo-activated') {
      const event: SequenceClearedEvent = {
        type: 'Combo.SequenceCleared',
        reason,
        timestamp: new Date(),
        source: 'MusicalComboDetectorService',
      };
      this.eventBus.emit(event);
    }

    this.logger.debug(this.config.logMessages.sequenceCleared);
  }

  /**
   * Get current active sequence
   */
  @logMethod
  public getCurrentSequence(): MusicalSequence | null {
    if (!this._currentSequence) {
      return null;
    }

    // Check if sequence is still valid (not timed out)
    const now = Date.now();
    if (now - this._currentSequence.lastKeyTime > this.config.sequenceTimeout) {
      this._clearSequence('timeout');
      return null;
    }

    return { ...this._currentSequence };
  }

  /**
   * Check if a sequence is a valid combo
   */
  @logMethod
  public isValidCombo(sequence: string[]): boolean {
    const patternKey = this.createPatternKey(sequence);
    return this._patterns.has(patternKey);
  }

  /**
   * Clear current sequence manually
   */
  @logMethod
  public clearSequence(): void {
    this._clearSequence('manual');
  }

  /**
   * Get cooldown remaining for any active combo (ms)
   */
  @logMethod
  public getCooldownRemaining(): number {
    const now = Date.now();
    const globalRemaining = Math.max(0, this.config.globalCooldown - (now - this._lastComboTime));

    // Also check individual combo cooldowns
    let maxCooldown = globalRemaining;
    for (const activeCombo of this._activeCombos.values()) {
      const remaining = Math.max(0, activeCombo.cooldownEndsAt - now);
      maxCooldown = Math.max(maxCooldown, remaining);
    }

    return maxCooldown;
  }

  /**
   * Update detector configuration
   */
  @logMethod
  @catchError
  public updateConfig(config: Partial<MusicalComboDetectorServiceConfig>): void {
    Object.assign(this.config, config);
    
    // Rebuild pattern map if patterns were updated
    if (config.patterns) {
      this.buildPatternMap();
    }

    this.logger.info('MusicalComboDetectorService configuration updated');
  }

  /**
   * Get all active combos
   */
  @logMethod
  public getActiveCombos(): ActiveCombo[] {
    return Array.from(this._activeCombos.values());
  }

  /**
   * Check if service is enabled
   */
  @logMethod
  public isEnabled(): boolean {
    return this.config.enabled && this._isInitialized;
  }
}
