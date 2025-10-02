/**
 * QUALIA.CODE v1.1 - Application Constants
 * Centralized type-safe constants to eliminate magic strings/numbers
 * 
 * PURPOSE: Replace all hardcoded values with named constants
 * COMPLIANCE: Section 7 - Configuration is King
 */

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
 * Type exports for type safety
 */
export type NotificationPriority = typeof NOTIFICATION_DEFAULTS.PRIORITY;
export type NotificationCategory = typeof NOTIFICATION_DEFAULTS.CATEGORY;
export type AudioWaveformType = typeof AUDIO_WAVEFORM_TYPES[keyof typeof AUDIO_WAVEFORM_TYPES];
export type AudioEventType = typeof AUDIO_EVENT_TYPES[keyof typeof AUDIO_EVENT_TYPES];
export type NoteGeometryType = typeof NOTE_GEOMETRY_TYPES[keyof typeof NOTE_GEOMETRY_TYPES];
