/**
 * QUALIA.CODE v1.1 - Application Constants
 * Centralized type-safe constants to eliminate magic strings/numbers
 * 
 * PURPOSE: Replace all hardcoded values with named constants
 * COMPLIANCE: Section 7 - Configuration is King
 */

/**
 * Event type identifiers for EventBus
 * Used throughout the application for type-safe event communication
 * ARCHITECTURAL MANDATE: Single source of truth for all event type strings
 */
export const EVENT_TYPES = {
  PLAYER_ACTION: "PlayerAction" as const,
  GAME_STATE_CHANGED: "GameStateChanged" as const,
  QUALIA_STATE_CALCULATED: "QualiaStateCalculated" as const,
  QUALIA_STATE_UPDATED: "QualiaStateUpdated" as const,
  SERVICE_STATUS_UPDATE: "ServiceStatusUpdate" as const,
  CONFIGURATION_LOADED: "ConfigurationLoaded" as const,
  ERROR: "Error" as const,
  BACKEND_SYNC_COMPLETE: "BackendSyncComplete" as const,
  AUDIO_EVENT: "AudioEvent" as const,
  RHYTHMIC_MOVEMENT_UPDATE: "RhythmicMovementUpdate" as const,
} as const;

/**
 * Game state identifiers
 * Used by GameControllerService and related systems
 * ARCHITECTURAL MANDATE: Single source of truth for game state strings
 */
export const GAME_STATES = {
  PLAYING: "Playing" as const,
  PAUSED: "Paused" as const,
  MENU: "Menu" as const,
  GAME_OVER: "GameOver" as const,
  LOADING: "Loading" as const,
  INITIALIZING: "Initializing" as const,
} as const;

/**
 * Player action identifiers
 * Used in PlayerActionEvent for type-safe action handling
 * ARCHITECTURAL MANDATE: Single source of truth for player action strings
 */
export const PLAYER_ACTIONS = {
  START_GAME: "StartGame" as const,
  PAUSE_GAME: "PauseGame" as const,
  RESET_GAME: "ResetGame" as const,
  HIT_NOTE: "HitNote" as const,
  MISS_NOTE: "MissNote" as const,
  DASH: "Dash" as const,
  FAST_FORWARD: "FastForward" as const,
  REWIND: "Rewind" as const,
  SCORE_INCREASE: "scoreIncrease" as const,
} as const;

/**
 * Notification system default values
 * Used by GameStateStore and NotificationService
 */
export const NOTIFICATION_DEFAULTS = {
  PRIORITY: "normal" as const,
  CATEGORY: "general" as const,
  SOURCE: "GameStateStore" as const,
} as const;

/**
 * Audio waveform types for WebAudio oscillators
 * Used by AudioService for sound synthesis
 */
export const AUDIO_WAVEFORM_TYPES = {
  SINE: "sine" as const,
  SQUARE: "square" as const,
  SAWTOOTH: "sawtooth" as const,
  TRIANGLE: "triangle" as const,
} as const;

/**
 * Event type identifiers for narrative and emergent systems
 * Used by AudioService for pattern recognition
 */
export const AUDIO_EVENT_TYPES = {
  NARRATIVE_EVENT: "NARRATIVE_EVENT" as const,
  COMBAT_EVENT: "COMBAT_EVENT" as const,
  AMBIENT_EVENT: "AMBIENT_EVENT" as const,
} as const;

/**
 * Musical note geometry type mappings
 * Defines the visual representation for each note type
 */
export const NOTE_GEOMETRY_TYPES = {
  HARMONY: "OctahedronGeometry" as const,
  CHAOS: "IcosahedronGeometry" as const,
  POWER: "BoxGeometry" as const,
  GRACE: "SphereGeometry" as const,
  DEFAULT: "ConeGeometry" as const,
} as const;

/**
 * AI analysis types for DebugService
 * Used to categorize different types of automated analysis results
 * ARCHITECTURAL MANDATE: Single source of truth for AI analysis type strings
 */
export const AI_ANALYSIS_TYPES = {
  ERROR_PATTERN: "error_pattern" as const,
  PERFORMANCE_ISSUE: "performance_issue" as const,
  STATE_ANOMALY: "state_anomaly" as const,
  RECOMMENDATION: "recommendation" as const,
} as const;

/**
 * Severity levels for analysis results and diagnostics
 * Used across DebugService and related diagnostic systems
 * ARCHITECTURAL MANDATE: Single source of truth for severity level strings
 */
export const SEVERITY_LEVELS = {
  LOW: "low" as const,
  MEDIUM: "medium" as const,
  HIGH: "high" as const,
  CRITICAL: "critical" as const,
} as const;

/**
 * Debug session configuration constants
 * Used for generating unique session identifiers
 * ARCHITECTURAL MANDATE: Single source of truth for debug session prefixes
 */
export const DEBUG_SESSION_PREFIX = "debug_session_" as const;

/**
 * Type exports for type safety
 */
export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];
export type GameState = typeof GAME_STATES[keyof typeof GAME_STATES];
export type PlayerAction = typeof PLAYER_ACTIONS[keyof typeof PLAYER_ACTIONS];
export type NotificationPriority = typeof NOTIFICATION_DEFAULTS.PRIORITY;
export type NotificationCategory = typeof NOTIFICATION_DEFAULTS.CATEGORY;
export type AudioWaveformType = typeof AUDIO_WAVEFORM_TYPES[keyof typeof AUDIO_WAVEFORM_TYPES];
export type AudioEventType = typeof AUDIO_EVENT_TYPES[keyof typeof AUDIO_EVENT_TYPES];
export type NoteGeometryType = typeof NOTE_GEOMETRY_TYPES[keyof typeof NOTE_GEOMETRY_TYPES];
