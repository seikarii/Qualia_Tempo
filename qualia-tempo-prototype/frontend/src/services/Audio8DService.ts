/**
 * QUALIA.CODE v2.0 - Audio8DService
 * Spatial 8D audio positioning service for immersive sound experience.
 *
 * Architecture:
 * - Listens to player movement events to update listener position
 * - Creates PannerNode instances for each positioned sound source
 * - Converts 2D game coordinates to 3D audio space (x, y → x, 0, y)
 * - Applies distance-based attenuation and Doppler effects
 * - Implements directional echo for Qualia collection feedback
 * - Follows IBaseService pattern for lifecycle management
 * - Uses @OnEvent decorators for event subscriptions
 *
 * QUALIA.CODE Compliance:
 * - IoC: Injectable with parameter object pattern
 * - Platform Abstraction: Uses IWebAudioAPIService, ITimerService
 * - Event-Driven: Consumes and emits events via EventBus
 * - Configuration: Externalized to audio-8d.yaml
 * - Decorators: @logMethod, @catchError, @OnEvent
 */

import { injectable, inject } from "inversify";
import { TYPES } from "./inversify.types";
import type { IAudio8DService } from "./interfaces/IAudio8DService";
import type { IEventBus } from "./interfaces/IEventBus";
import type { ILogger } from "./interfaces/ILogger";
import type { ITimerService } from "./interfaces/ITimerService";
import type { IWebAudioAPIService } from "./interfaces/IWebAudioAPIService";
import type { 
  Audio8DServiceConfig, 
  Audio8DServiceParams,
  SpatialSoundSource,
  ListenerPosition
} from "./contracts/IAudio8DService.contracts";
import type { EntityPositionUpdatedEvent } from "./contracts/events.contracts";
import {
  logMethod,
  catchError,
  measureTime,
  OnEvent,
  IBaseService,
  initializeEventSubscriptions,
  cleanupEventSubscriptions,
} from "../utils/decorators";

@injectable()
export class Audio8DService implements IAudio8DService, IBaseService {
  private readonly config: Audio8DServiceConfig;
  // QUALIA.CODE v1.1: EventBus required for @OnEvent decorator lifecycle management
  // @ts-expect-error - Used by @OnEvent decorator infrastructure
  private readonly eventBus: IEventBus;
  private readonly logger: ILogger;
  private readonly timerService: ITimerService;
  private readonly webAudioService: IWebAudioAPIService;

  // @ts-expect-error - Reserved for @OnEvent decorator lifecycle management
  private _eventListeners: string[] = [];
  
  // Spatial audio state
  private audioContext: AudioContext | null = null;
  private soundSources: Map<string, SpatialSoundSource> = new Map();
  private _isEnabled = false;
  private updateLoopId: number | null = null;
  
  // Listener state
  private listenerPosition: ListenerPosition = {
    x: 0,
    y: 0,
    forwardX: 0,
    forwardY: 1,
    upX: 0,
    upY: 1,
  };

  constructor(
    @inject(TYPES.Audio8DServiceParams) params: Audio8DServiceParams
  ) {
    this.eventBus = params.eventBus;
    this.logger = params.logger;
    this.timerService = params.timerService;
    this.webAudioService = params.webAudioService;
    this.config = params.config;
    this.logger.info(this.config.messages.initialized);
  }

  @logMethod
  @catchError
  public initialize(): void {
    initializeEventSubscriptions(this);
    
    if (!this.config.enabled) {
      this.logger.info("Audio8DService disabled by configuration");
      return;
    }

    // Setup will happen when audio context is ready
    this.logger.info("Audio8DService initialized and waiting for audio context");
  }

  @logMethod
  @catchError
  public cleanup(): void {
    this.stopPositionUpdates();
    this.clearAllSoundSources();
    cleanupEventSubscriptions(this);
    this.logger.info("Audio8DService cleaned up");
  }

  @logMethod
  @catchError
  public createSoundSource(id: string, position: { x: number; y: number }): SpatialSoundSource {
    if (!this._isEnabled || !this.audioContext) {
      throw new Error("Audio8DService not enabled or audio context not ready");
    }

    // Create panner and gain nodes
    const pannerNode = this.audioContext.createPanner();
    const gainNode = this.audioContext.createGain();

    // Configure panner
    pannerNode.panningModel = 'HRTF'; // Head-related transfer function for realistic 3D
    pannerNode.distanceModel = this.config.distanceModel;
    pannerNode.refDistance = this.config.refDistance;
    pannerNode.maxDistance = this.config.maxDistance;
    pannerNode.rolloffFactor = this.config.rolloffFactor;
    
    if (this.config.enableDoppler) {
      pannerNode.coneInnerAngle = 360;
      pannerNode.coneOuterAngle = 360;
      pannerNode.coneOuterGain = 1;
    }

    // Set initial position (convert 2D to 3D: x, 0, y)
    const position3D = this.convert2DTo3D(position);
    pannerNode.positionX.value = position3D.x;
    pannerNode.positionY.value = position3D.y;
    pannerNode.positionZ.value = position3D.z;

    // Connect nodes: source → gain → panner → destination
    gainNode.connect(pannerNode);
    pannerNode.connect(this.audioContext.destination);

    const soundSource: SpatialSoundSource = {
      id,
      pannerNode,
      gainNode,
      position,
      velocity: { x: 0, y: 0 },
      active: true,
    };

    this.soundSources.set(id, soundSource);
    this.logger.debug(`Created sound source: ${id} at (${position.x}, ${position.y})`);

    return soundSource;
  }

  @logMethod
  @catchError
  public removeSoundSource(id: string): void {
    const source = this.soundSources.get(id);
    if (!source) {
      this.logger.warn(`Sound source not found: ${id}`);
      return;
    }

    // Disconnect nodes
    source.gainNode.disconnect();
    source.pannerNode.disconnect();
    source.active = false;

    this.soundSources.delete(id);
    this.logger.debug(`Removed sound source: ${id}`);
  }

  @measureTime
  @logMethod
  @catchError
  public updateSoundSourcePosition(
    id: string,
    position: { x: number; y: number },
    velocity?: { x: number; y: number }
  ): void {
    const source = this.soundSources.get(id);
    if (!source || !source.active) {
      return;
    }

    // Update position
    source.position = position;
    const position3D = this.convert2DTo3D(position);
    
    source.pannerNode.positionX.value = position3D.x;
    source.pannerNode.positionY.value = position3D.y;
    source.pannerNode.positionZ.value = position3D.z;

    // Update velocity for Doppler effect
    if (this.config.enableDoppler && velocity) {
      source.velocity = velocity;
      // Note: Web Audio API doesn't have direct velocity setters anymore
      // Doppler is calculated automatically based on position changes
    }
  }

  @logMethod
  @catchError
  public updateListenerPosition(position: ListenerPosition): void {
    if (!this._isEnabled || !this.audioContext) {
      return;
    }

    this.listenerPosition = position;
    const listener = this.audioContext.listener;

    // Update listener position (convert 2D to 3D)
    const position3D = this.convert2DTo3D({ x: position.x, y: position.y });
    
    if (listener.positionX) {
      listener.positionX.value = position3D.x;
      listener.positionY.value = position3D.y;
      listener.positionZ.value = position3D.z;
    }

    // Update listener orientation
    const forwardVector = this.convert2DTo3D({ x: position.forwardX, y: position.forwardY });
    const upVector = { x: 0, y: 1, z: 0 }; // Always up in 3D space

    if (listener.forwardX) {
      listener.forwardX.value = forwardVector.x;
      listener.forwardY.value = forwardVector.y;
      listener.forwardZ.value = forwardVector.z;

      listener.upX.value = upVector.x;
      listener.upY.value = upVector.y;
      listener.upZ.value = upVector.z;
    }
  }

  /**
   * PHASE 4 INTEGRATION: Handle entity position updates for spatial audio
   * Receives position updates from game state and updates sound source positions
   */
  @OnEvent('Entity.PositionUpdated')
  // @ts-expect-error - Method used by @OnEvent decorator but TypeScript cannot detect it
  private handleEntityPositionUpdate(event: EntityPositionUpdatedEvent): void {
    if (!this._isEnabled) {
      return;
    }

    // Update sound source position based on entity type
    if (event.entityType === 'player') {
      // Update listener position for player movement
      this.updateListenerPosition({
        x: event.position.x,
        y: event.position.z, // Use Z as Y in 2D space
        forwardX: 0,
        forwardY: 1,
        upX: 0,
        upY: 1,
      });
    } else if (event.entityType === 'boss' || event.entityType === 'particle') {
      // Update sound source position if it exists
      const sourceId = event.entityId;
      if (this.soundSources.has(sourceId)) {
        this.updateSoundSourcePosition(
          sourceId,
          { x: event.position.x, y: event.position.z },
          event.velocity ? { x: event.velocity.x, y: event.velocity.z } : undefined
        );
      }
    }
  }

  @logMethod
  @catchError
  public connectAudioSource(sourceId: string, audioSource: AudioNode): void {
    const source = this.soundSources.get(sourceId);
    if (!source) {
      throw new Error(`Sound source not found: ${sourceId}`);
    }

    // Connect: audioSource → gainNode → pannerNode → destination
    audioSource.connect(source.gainNode);
    this.logger.debug(`Connected audio source to ${sourceId}`);
  }

  @logMethod
  @catchError
  public disconnectAudioSource(sourceId: string): void {
    const source = this.soundSources.get(sourceId);
    if (!source) {
      this.logger.warn(`Sound source not found: ${sourceId}`);
      return;
    }

    // Disconnect all inputs to the gain node
    source.gainNode.disconnect();
    this.logger.debug(`Disconnected audio source from ${sourceId}`);
  }

  @logMethod
  @catchError
  public createDirectionalEcho(
    position: { x: number; y: number },
    direction: { x: number; y: number },
    intensity: number
  ): void {
    if (!this.config.enableDirectionalEcho || !this._isEnabled || !this.audioContext) {
      return;
    }

    // Create a temporary oscillator for the echo sound
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const delayNode = this.audioContext.createDelay(this.config.echoDelayTime);
    const feedbackNode = this.audioContext.createGain();

    // Configure echo effect
    oscillator.frequency.value = 440 * (1 + intensity); // Pitch varies with intensity
    gainNode.gain.value = intensity * 0.3; // Volume
    delayNode.delayTime.value = this.config.echoDelayTime;
    feedbackNode.gain.value = this.config.echoFeedback;

    // Create a temporary panner for the echo
    const echoSourceId = `echo_${Date.now()}`;
    const echoPosition = {
      x: position.x + direction.x * 10, // Position echo in direction
      y: position.y + direction.y * 10,
    };
    
    const echoSource = this.createSoundSource(echoSourceId, echoPosition);

    // Connect echo chain: oscillator → delay → feedback → gain → panner
    oscillator.connect(delayNode);
    delayNode.connect(feedbackNode);
    feedbackNode.connect(delayNode); // Feedback loop
    feedbackNode.connect(gainNode);
    gainNode.connect(echoSource.gainNode);

    // Play and cleanup
    const currentTime = this.audioContext.currentTime;
    oscillator.start(currentTime);
    oscillator.stop(currentTime + 0.5); // Short burst

    // Cleanup after echo finishes
    this.timerService.setTimeout(() => {
      this.removeSoundSource(echoSourceId);
    }, 1000);
  }

  @measureTime
  @logMethod
  public getActiveSoundSources(): SpatialSoundSource[] {
    return Array.from(this.soundSources.values()).filter(source => source.active);
  }

  @logMethod
  public isEnabled(): boolean {
    return this._isEnabled;
  }

  // === PRIVATE METHODS ===

  /**
   * Event handler for System.Audio.Ready
   * Sets up spatial audio when audio context is ready
   */
  @catchError
  @OnEvent("System.Audio.Ready")
  // @ts-expect-error - Method used by @OnEvent decorator
  private onAudioReady(): void {
    if (!this.config.enabled) {
      return;
    }

    this.logger.info(this.config.messages.audioReady);
    this.setupSpatialAudio();
  }

  /**
   * Setup spatial audio system
   */
  @catchError
  private setupSpatialAudio(): void {
    try {
      this.audioContext = this.webAudioService.getAudioContext();
      
      // Set initial listener position
      this.updateListenerPosition(this.listenerPosition);

      this._isEnabled = true;
      this.startPositionUpdates();
      this.logger.info(this.config.messages.spatialAudioStarted);
    } catch (error) {
      this.logger.error("Failed to setup spatial audio:", error as Record<string, unknown>);
    }
  }

  /**
   * Start position update loop
   */
  @catchError
  private startPositionUpdates(): void {
    if (this.updateLoopId !== null) {
      return; // Already running
    }

    this.runUpdateLoop();
  }

  /**
   * Stop position update loop
   */
  @catchError
  private stopPositionUpdates(): void {
    if (this.updateLoopId !== null) {
      this.timerService.cancelAnimationFrame(this.updateLoopId);
      this.updateLoopId = null;
      this.logger.info(this.config.messages.spatialAudioStopped);
    }
  }

  /**
   * Main update loop
   * Runs on requestAnimationFrame for smooth position updates
   */
  @catchError
  private runUpdateLoop(): void {
    if (!this._isEnabled) {
      return;
    }

    // Position updates happen in event handlers
    // This loop just ensures we stay synchronized with frame updates

    // Schedule next frame
    this.updateLoopId = this.timerService.requestAnimationFrame(() => {
      this.runUpdateLoop();
    });
  }

  /**
   * Convert 2D game coordinates to 3D audio space
   * Maps 2D (x, y) → 3D (x, 0, y)
   * This allows 2D game to have spatial audio
   */
  private convert2DTo3D(position2D: { x: number; y: number }): { x: number; y: number; z: number } {
    return {
      x: position2D.x * this.config.panningScale,
      y: 0, // 2D game has no vertical component
      z: position2D.y * this.config.panningScale,
    };
  }

  /**
   * Clear all sound sources
   */
  private clearAllSoundSources(): void {
    for (const id of this.soundSources.keys()) {
      this.removeSoundSource(id);
    }
  }
}
