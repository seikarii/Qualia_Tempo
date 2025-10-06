/**
 * QUALIA.CODE v1.1 - IAudioService Contracts
 * Single Source of Truth for AudioService data structures.
 * This file is manually maintained for AudioService-specific contracts.
 */

import type { IEventBus } from "../interfaces/IEventBus";
import type { ILogger } from "../interfaces/ILogger";
import type { IOntologicalAudioEngine } from "../../audio/IOntologicalAudioEngine";
import type { IWebAudioAPIService } from "../interfaces/IWebAudioAPIService";
import type { ITimerService } from "../interfaces/ITimerService";

// Parameter object for AudioService constructor
export interface AudioServiceParams {
  eventBus: IEventBus;
  logger: ILogger;
  config: AudioServiceConfig;
  audioEngine: IOntologicalAudioEngine;
  webAudioAPIService: IWebAudioAPIService;
  timerService: ITimerService;
}

// AudioService Configuration - Migrated from ConfigurationService.ts
export interface AudioServiceConfig {
  rhythmicFeedback: {
    perfect: { frequency: number; gain: number; duration: number; waveform: string };
    good: { frequency: number; gain: number; duration: number; waveform: string };
    miss: { frequency: number; gain: number; duration: number; waveform: string };
  };
  metronome: {
    frequency: number;
    gain: number;
    duration: number;
    waveform: string;
    minFrequency: number;
    maxFrequency: number;
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
  
  // Base qualia state for entity voices
  baseQualiaState: {
    intensity: number;
    precision: number;
    aggression: number;
    flow: number;
    chaos: number;
    recovery: number;
    transcendence: number;
  };
  
  // Thresholds for emergent audio behaviors
  transcendenceThreshold: number;
  
  // Event type configuration
  emergentEventType: string;
  
  // Default volume for audio operations
  defaultVolume: number;
  
  // Time conversion constants
  millisecondsToSecondsConversion: number;
  
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