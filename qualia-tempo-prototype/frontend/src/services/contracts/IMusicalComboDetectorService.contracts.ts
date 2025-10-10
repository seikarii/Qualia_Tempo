/**
 * IMusicalComboDetectorService Contracts
 * Musical combo detection configuration and parameter contracts
 * 
 * ARCHITECTURE: Direct Configuration Injection Pattern (QUALIA.CODE v1.1)
 * - Service receives typed config object directly via constructor
 * - No dependency on IConfigurationService (Service Locator anti-pattern eliminated)
 * 
 * LINT EXCEPTION: This file uses 'any' types for service dependencies to avoid circular imports.
 * This is an intentional architectural pattern for Params interfaces in contracts.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Combo type enumeration
 */
export type ComboType = 'harmonic' | 'chaotic' | 'neutral';

/**
 * Combo effect type enumeration
 */
export type ComboEffectType = 
  // Harmonic effects (beneficial)
  | 'whirlwind'           // Q+E+R - Area control, attracts Qualia
  | 'attractor'           // Q+R+F - Massive Qualia collection in radius
  | 'repulsor'            // T+E+R - Defense, repels boss attacks
  | 'comboMultiplier'     // Q+E+T - +50% score boost temporarily
  | 'healing'             // F+G+C - Gradual health restore
  | 'fullScale'           // Q+E+R+T+F+G+C - Full heal + temp shield
  // Chaotic effects (malicious)
  | 'soundWall'           // Q+T+G - Blocks movement in area
  | 'damageZone'          // E+F+C - Damage over time in circular area
  | 'inverseRepulsor'     // R+G+T - Pushes player towards boss
  | 'hostileAttractor'    // Q+G+C - Attracts boss towards player
  | 'auditoryInterference' // T+F+R - Reduces collection precision
  // Neutral
  | 'unknown';

/**
 * Musical combo pattern definition
 */
export interface ComboPattern {
  id: string;
  keys: string[];              // Key sequence (e.g., ['Q', 'E', 'R'])
  type: ComboType;             // harmonic, chaotic, or neutral
  effect: ComboEffectType;     // Effect identifier
  harmonicScore: number;       // Base harmonic score (0-1, positive = harmonic, negative = chaotic)
  cooldown: number;            // Cooldown in milliseconds
  description: string;         // Human-readable description
}

/**
 * Active combo state
 */
export interface ActiveCombo {
  pattern: ComboPattern;
  activatedAt: number;         // Timestamp of activation
  expiresAt: number;           // Timestamp of expiration
  cooldownEndsAt: number;      // Timestamp when cooldown ends
}

/**
 * Musical sequence being built
 */
export interface MusicalSequence {
  keys: string[];              // Keys pressed so far
  timestamp: number;           // Timestamp of first key press
  lastKeyTime: number;         // Timestamp of last key press
  isValid: boolean;            // Whether sequence is still valid (not timed out)
  harmonicScore?: number;      // Computed harmonic score (if validated)
}

/**
 * Combo detection result
 */
export interface ComboDetectionResult {
  matched: boolean;
  pattern?: ComboPattern;
  harmonicScore?: number;
  contextModifier?: number;    // Modifier based on song harmony context
}

/**
 * Service configuration interface
 * Externalized to YAML file: /frontend/public/config/musical-combo-detector.yaml
 */
export interface MusicalComboDetectorServiceConfig {
  enabled: boolean;

  // Timing configuration
  sequenceTimeout: number;     // Max time between key presses (ms)
  minSequenceLength: number;   // Minimum keys for a combo (default: 2)
  maxSequenceLength: number;   // Maximum keys for a combo (default: 7)

  // Cooldown configuration
  globalCooldown: number;      // Global cooldown between any combos (ms)
  defaultComboCooldown: number; // Default cooldown per combo pattern (ms)

  // Harmony configuration
  harmonicThreshold: number;   // Threshold for harmonic vs chaotic (0.5 = neutral)
  contextualAnalysis: boolean; // Enable context-based harmony analysis

  // Combo patterns
  patterns: ComboPattern[];

  // Event configuration
  emitEvents: boolean;         // Emit combo events to EventBus

  // Logging configuration
  logMessages: {
    serviceInitialized: string;
    comboDetected: string;
    comboExpired: string;
    sequenceCleared: string;
    cooldownActive: string;
  };
}

/**
 * Parameter object for MusicalComboDetectorService constructor
 * Follows Parameter Object Pattern for clean dependency injection
 */
export interface MusicalComboDetectorServiceParams {
  eventBus: any;               // IEventBus (using 'any' to avoid circular import)
  logger: any;                 // ILogger
  timerService: any;           // ITimerService
  config: MusicalComboDetectorServiceConfig;
}
