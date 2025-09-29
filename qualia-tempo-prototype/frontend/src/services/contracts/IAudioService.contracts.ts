/**
 * QUALIA.CODE v1.1 - IAudioService Contracts
 * Single Source of Truth for AudioService data structures.
 * This file is manually maintained for AudioService-specific contracts.
 */

// AudioService Configuration - Migrated from ConfigurationService.ts
export interface AudioServiceConfig {
  rhythmicFeedback: {
    perfect: { frequency: number; gain: number; duration: number };
    good: { frequency: number; gain: number; duration: number };
    miss: { frequency: number; gain: number; duration: number };
  };
  metronome: {
    frequency: number;
    gain: number;
    duration: number;
  };
  audioEngine: {
    sampleRate: number;
    channels: number;
    bufferSize: number;
  };
  entityVoices: {
    player: { baseFrequency: number; modulationRange: number };
    boss: { baseFrequency: number; modulationRange: number };
    environment: { baseFrequency: number; modulationRange: number };
    defaultEntities: string[];
  };
  enableAudioPooling: boolean;
  maxConcurrentSounds: number;
  audioFadeTime: number;
  volume: number; // Master volume setting
  enableSubtitles: boolean; // Subtitle support for accessibility
  soundEnabled: boolean; // Global sound enable/disable toggle
  musicEnabled: boolean; // Music enable/disable toggle
  muteDuringDevelopment: boolean; // Development mute setting
  defaultSoundDuration: number;
  preloadSimulationDelay: number;
  soundFrequencies: Record<string, number>;
  defaultFrequency: number;
  
  // Messages for logging
  messages: {
    audioContextNotAvailable: string;
    audioNotInitialized: string;
    cannotCreateEntityVoice: string;
    cannotRemoveEntityVoice: string;
    cannotRemoveEntityVoices: string;
    cannotPreloadSounds: string;
    preloadingSounds: string;
    soundsPreloaded: string;
  };
}