/**
 * QUALIA.CODE v2.0 - Audio8DService Contracts
 * Configuration and parameter contracts for spatial 8D audio positioning.
 *
 * PURPOSE: Define configuration shape for Audio8DService
 * ARCHITECTURE: Direct Configuration Injection pattern (NOT IConfigurationService)
 */

import type { IEventBus } from '../interfaces/IEventBus';
import type { ILogger } from '../interfaces/ILogger';
import type { IWebAudioAPIService } from '../interfaces/IWebAudioAPIService';
import type { ITimerService } from '../interfaces/ITimerService';

/**
 * Audio8DServiceConfig
 * Configuration loaded from audio-8d.yaml
 */
export interface Audio8DServiceConfig {
  /** Feature flag - enable/disable spatial audio */
  enabled: boolean;

  /** Distance model for 3D audio positioning */
  distanceModel: 'linear' | 'inverse' | 'exponential';

  /** Reference distance for panning calculations (game units) */
  refDistance: number;

  /** Maximum distance for audio falloff (game units) */
  maxDistance: number;

  /** Rolloff factor for distance attenuation */
  rolloffFactor: number;

  /** Pan angle scaling factor (how much movement affects stereo) */
  panningScale: number;

  /** Enable Doppler effect simulation */
  enableDoppler: boolean;

  /** Doppler speed multiplier */
  dopplerFactor: number;

  /** Speed of sound for Doppler calculations (game units/sec) */
  speedOfSound: number;

  /** Update interval for position recalculation (ms) */
  updateInterval: number;

  /** Enable directional echo for Qualia collection events */
  enableDirectionalEcho: boolean;

  /** Echo delay time (seconds) */
  echoDelayTime: number;

  /** Echo feedback amount (0-1) */
  echoFeedback: number;

  /** Log messages */
  messages: {
    initialized: string;
    audioReady: string;
    spatialAudioStarted: string;
    spatialAudioStopped: string;
    positionUpdated: string;
  };
}

/**
 * Audio8DServiceParams
 * Dependencies injected into Audio8DService constructor.
 * QUALIA.CODE: Parameter Object Pattern (max 4 params rule compliance)
 */
export interface Audio8DServiceParams {
  eventBus: IEventBus;
  logger: ILogger;
  webAudioService: IWebAudioAPIService;
  timerService: ITimerService;
  config: Audio8DServiceConfig;
}

/**
 * SpatialSoundSource
 * Represents a positioned sound source in the game world
 */
export interface SpatialSoundSource {
  /** Unique identifier for the sound source */
  id: string;

  /** PannerNode for this source */
  pannerNode: PannerNode;

  /** GainNode for volume control */
  gainNode: GainNode;

  /** Current position in 2D game space */
  position: { x: number; y: number };

  /** Current velocity for Doppler effect */
  velocity: { x: number; y: number };

  /** Whether this source is active */
  active: boolean;
}

/**
 * ListenerPosition
 * Represents the audio listener's position (usually the player)
 */
export interface ListenerPosition {
  /** Position in 2D game space */
  x: number;
  y: number;

  /** Forward orientation vector */
  forwardX: number;
  forwardY: number;

  /** Up orientation vector (always 0, 0, 1 for 2D) */
  upX: number;
  upY: number;
}
