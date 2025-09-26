import { injectable, inject } from 'inversify';
import { TYPES } from './inversify.types';
import type { PlayerActionEvent, PlayerInputEvent } from './EventBus';
import type { GameStateChangedEvent, MetronomeTickEvent, RhythmicDashEvent } from './EventBus';
import { logMethod, catchError } from '../utils/decorators';
import type { QualiaState } from '../types/contracts';
import type { IRhythmicMovementController } from './interfaces/IRhythmicMovementController';
import type { IEventBus } from './interfaces/IEventBus';
import type { ILogger } from './interfaces/ILogger';
import type { IConfigurationService } from './interfaces/IConfigurationService';

// PURE DI: Configuration interface for this service
export interface RhythmicMovementConfig {
  bpm: number;
  perfectTiming: number;
  goodTiming: number;
  gridSize: number;
  slowdownFactor: number;
  slowdownDuration: number;
  keyThrottleMs: number; // CRISALIDA.CODE: Configuration-driven throttling
}

/**
 * RhythmicMovementController - Core rhythm game logic
 * QUALIA.CODE v7: InversifyJS Compliant - Uses ConfigurationService for settings
 */
@injectable()
export class RhythmicMovementController implements IRhythmicMovementController {
  private eventBus: IEventBus;
  private logger: ILogger;
  private configService: IConfigurationService;
  private config!: RhythmicMovementConfig; // Will be loaded in constructor
  
  private playerPosition: [number, number] = [4, 4]; // Center of 8x8 grid
  private isListening: boolean = false;
  
  // Rhythm timing settings - will be loaded from injected config
  private bpm!: number;
  private perfectTiming!: number;
  private goodTiming!: number;
  private gridSize!: number;
  private lastBeatTime: number = 0;
  private beatInterval!: number;
  private beatNumber: number = 0;
  private metronomeIntervalId: number | null = null;
  
  // Pause and slowdown settings - will be loaded from injected config
  private isPaused: boolean = false;
  private gameIsPlaying: boolean = false;
  private slowdownFactor!: number;
  private slowdownTimeout: number | null = null;
  private gameStateListenerId: string | null = null;
  
  // CRISALIDA.CODE: Configuration-driven throttling
  private keyThrottleMs!: number;
  private lastKeyPressTime: number = 0;
  
  // Interface implementation properties
  private currentIntensity: number = 0.5;
  private updatesPerformed: number = 0;
  private totalUpdateTime: number = 0;

  constructor(
    @inject(TYPES.IEventBus) eventBus: IEventBus,
    @inject(TYPES.ILogger) logger: ILogger,
    @inject(TYPES.IConfigurationService) configService: IConfigurationService
  ) {
    this.eventBus = eventBus;
    this.logger = logger;
    this.configService = configService;
    
    this.logger.info("RhythmicMovementController initialized - configuration will be loaded on start()");
  }

  /**
   * QUALIA.CODE: Ensure configuration is loaded when service starts
   * This replaces the anti-pattern of loading config in constructor
   */
  private ensureConfigurationLoaded(): void {
    const rhythmicConfig = this.configService.getRhythmicMovementConfig();
    
    this.config = {
      bpm: rhythmicConfig.bpm || 120,
      perfectTiming: rhythmicConfig.perfectTiming || 100,
      goodTiming: rhythmicConfig.goodTiming || 200,
      gridSize: rhythmicConfig.gridSize || 32,
      slowdownFactor: rhythmicConfig.slowdownFactor || 0.3,
      slowdownDuration: rhythmicConfig.slowdownDuration || 500,
      keyThrottleMs: rhythmicConfig.keyThrottleMs || 50
    };
    
    this.loadConfigurationValues();
    this.beatInterval = (60 / this.bpm) * 1000; // Convert BPM to milliseconds
    
    this.logger.info('Configuration loaded successfully', { config: this.config });
  }

  /**
   * Load values from configuration object into instance variables
   */
  private loadConfigurationValues(): void {
    this.bpm = this.config.bpm;
    this.perfectTiming = this.config.perfectTiming;
    this.goodTiming = this.config.goodTiming;
    this.gridSize = this.config.gridSize;
    this.slowdownFactor = this.config.slowdownFactor;
    this.keyThrottleMs = this.config.keyThrottleMs; // CRISALIDA.CODE: Load throttle configuration
  }

  @logMethod()
  @catchError()
  public start(): void {
    if (this.isListening) {
      this.logger.warn('RhythmicMovementController already started');
      return;
    }

    // QUALIA.CODE: Load configuration when service starts, not in constructor
    this.ensureConfigurationLoaded();

    this.setupInputListener();
    this.setupGameStateListener();
    this.startMetronome();
    this.isListening = true;
    this.logger.info('🎵 RhythmicMovementController started with configuration loaded');
  }

  @logMethod()
  @catchError()
  public stop(): void {
    if (!this.isListening) {
      this.logger.warn('RhythmicMovementController not running');
      return;
    }

    this.removeInputListener();
    this.removeGameStateListener();
    this.stopMetronome();
    this.isListening = false;
    this.logger.info('🎵 RhythmicMovementController stopped');
  }

  private setupGameStateListener(): void {
    // Listen for game state changes to handle pause/resume
    this.gameStateListenerId = this.eventBus.subscribe<GameStateChangedEvent>('GameStateChanged', (event) => {
      this.handleGameStateChange(event);
    });
  }

  private removeGameStateListener(): void {
    if (this.gameStateListenerId) {
      this.eventBus.unsubscribe(this.gameStateListenerId);
      this.gameStateListenerId = null;
    }
  }

  @logMethod()
  private handleGameStateChange(event: GameStateChangedEvent): void {
    const newState = event.newState;
    
    // Update playing state
    this.gameIsPlaying = (newState === 'Playing');
    
    if (newState === 'Paused') {
      this.activatePauseWithSlowdown();
    } else if (newState === 'Playing' && this.isPaused) {
      this.resumeFromPause();
    }
  }

  @logMethod()
  private activatePauseWithSlowdown(): void {
    const slowdownDuration = this.config.slowdownDuration;
    const slowdownFactor = this.config.slowdownFactor;
    
    this.logger.info(`Activating pause with ${slowdownDuration}ms slowdown effect`);
    
    // Set slowdown factor
    this.slowdownFactor = slowdownFactor;
    this.isPaused = true;
    
    // Apply slowdown effect for configured duration, then fully pause
    this.slowdownTimeout = window.setTimeout(() => {
      this.slowdownFactor = 0.0; // Complete pause
      this.stopMetronome();
      this.logger.info('Transitioning to full pause');
    }, slowdownDuration);
  }

  @logMethod()
  private resumeFromPause(): void {
    this.logger.info('▶️ Resuming from pause');
    
    // Clear slowdown timeout if still active
    if (this.slowdownTimeout) {
      clearTimeout(this.slowdownTimeout);
      this.slowdownTimeout = null;
    }
    
    // Reset to normal speed
    this.slowdownFactor = 1.0;
    this.isPaused = false;
    
    // Restart metronome
    this.startMetronome();
  }

  @logMethod()
  private startMetronome(): void {
    this.metronomeIntervalId = window.setInterval(() => {
      // Skip metronome ticks when completely paused
      if (this.slowdownFactor === 0.0) {
        return;
      }
      
      this.beatNumber++;
      this.lastBeatTime = performance.now();
      
      // Emit metronome tick event with slowdown factor
      this.eventBus.emit<MetronomeTickEvent>({
        type: 'MetronomeTick',
        beatNumber: this.beatNumber,
        bpm: this.bpm * this.slowdownFactor, // Affected by slowdown
        source: 'RhythmicMovementController'
      });
    }, this.beatInterval / this.slowdownFactor); // Adjust interval based on slowdown
  }

  private stopMetronome(): void {
    if (this.metronomeIntervalId) {
      clearInterval(this.metronomeIntervalId);
      this.metronomeIntervalId = null;
    }
  }

  private setupInputListener(): void {
    this.eventBus.subscribe<PlayerInputEvent>('PlayerInput', this.handlePlayerInput);
  }

  private removeInputListener(): void {
    // In an event-driven system, you might not need to manually remove listeners
    // if the EventBus handles lifecycle management. However, if you have specific
    // listener IDs, you would unsubscribe here.
  }

  private handlePlayerInput = (event: PlayerInputEvent): void => {
    // CRISALIDA.CODE: Configuration-driven throttling implementation
    const now = performance.now();
    if (now - this.lastKeyPressTime < this.keyThrottleMs) {
      return; // Throttle the input
    }
    this.lastKeyPressTime = now;
    
    const direction = this.getDirectionFromKey(event.key);
    if (!direction) return;

    this.processDashInput(direction);
  };

  private getDirectionFromKey(key: string): 'north' | 'south' | 'east' | 'west' | null {
    if (!key) return null; // Handle undefined/null keys
    
    switch (key.toLowerCase()) {
      case 'w':
      case 'arrowup':
        return 'north';
      case 's':
      case 'arrowdown':
        return 'south';
      case 'd':
      case 'arrowright':
        return 'east';
      case 'a':
      case 'arrowleft':
        return 'west';
      default:
        return null;
    }
  }

  @logMethod()
  private processDashInput(direction: 'north' | 'south' | 'east' | 'west'): void {
    // Don't process input when paused OR when game is not playing
    if (this.isPaused || !this.isGameActive()) {
      this.logger.debug('🚫 Input ignored - game is paused or not active');
      return;
    }
    
    const currentTime = performance.now();
    const timeSinceLastBeat = currentTime - this.lastBeatTime;
    const nextBeatTime = this.beatInterval - timeSinceLastBeat;
    
    // Calculate timing accuracy
    const timing = this.calculateTiming(Math.min(timeSinceLastBeat, nextBeatTime));
    
    // Calculate new position
    const newPosition = this.calculateNewPosition(direction);
    
    // Emit rhythmic dash event
    this.eventBus.emit<RhythmicDashEvent>({
      type: 'RhythmicDash',
      direction,
      timing,
      newPosition,
      source: 'RhythmicMovementController'
    });

    // Update player position if movement is valid
    if (this.isValidPosition(newPosition)) {
      this.playerPosition = newPosition;
      
      // Emit player action for QualiaState calculation
      this.eventBus.emit<PlayerActionEvent>({
        type: 'PlayerAction',
        action: timing === 'miss' ? 'MissNote' : 'HitNote',
        source: 'RhythmicMovementController'
      });
    }
  }

  private calculateTiming(timingOffset: number): 'perfect' | 'good' | 'miss' {
    if (timingOffset <= this.perfectTiming) {
      return 'perfect';
    } else if (timingOffset <= this.goodTiming) {
      return 'good';
    } else {
      return 'miss';
    }
  }

  private calculateNewPosition(direction: 'north' | 'south' | 'east' | 'west'): [number, number] {
    const [x, z] = this.playerPosition;
    
    switch (direction) {
      case 'north':
        return [x - 1, z];  // W moves up/north 
      case 'south':
        return [x + 1, z];  // S moves down/south 
      case 'east':
        return [x, z + 1];  // D moves right/east
      case 'west':
        return [x, z - 1];  // A moves left/west
    }
  }

  private isValidPosition([x, z]: [number, number]): boolean {
    return x >= 0 && x < this.gridSize && z >= 0 && z < this.gridSize;
  }

  public getPlayerPosition(): [number, number] {
    return this.playerPosition;
  }

  public setBPM(bpm: number): void {
    this.bpm = bpm;
    this.beatInterval = (60 / this.bpm) * 1000;
    
    // Restart metronome with new timing
    if (this.isListening) {
      this.stopMetronome();
      this.startMetronome();
    }
  }

  /**
   * Check if the game is currently active (playing and not paused)
   */
  private isGameActive(): boolean {
    return this.gameIsPlaying && !this.isPaused;
  }

  // ==================== IRhythmicMovementController INTERFACE IMPLEMENTATION ====================

  /**
   * Update movement based on QualiaState.
   */
  @logMethod()
  @catchError()
  public updateMovement(qualiaState: QualiaState): void {
    const startTime = performance.now();
    
    // Update internal state based on qualia
    this.currentIntensity = qualiaState.intensity;
    
    // Update BPM based on flow and intensity
    const dynamicBPM = this.config.bpm * (1 + (qualiaState.flow * 0.3));
    this.setBPM(dynamicBPM);
    
    // Track performance metrics
    this.updatesPerformed++;
    this.totalUpdateTime += performance.now() - startTime;
    
    this.logger.debug('Movement updated based on QualiaState', { 
      intensity: qualiaState.intensity,
      flow: qualiaState.flow,
      newBPM: dynamicBPM 
    });
  }

  /**
   * Set the intensity of rhythmic movement.
   */
  @logMethod()
  @catchError()
  public setIntensity(intensity: number): void {
    this.currentIntensity = Math.max(0, Math.min(1, intensity));
    this.logger.debug('Movement intensity set', { intensity: this.currentIntensity });
  }

  /**
   * Get the current movement intensity.
   */
  public getIntensity(): number {
    return this.currentIntensity;
  }

  /**
   * Check if the controller is currently running.
   */
  public isRunning(): boolean {
    return this.isListening;
  }

  /**
   * Update the movement configuration.
   */
  @logMethod()
  @catchError()
  public updateConfig(config: any): void {
    this.config = { ...this.config, ...config };
    this.loadConfigurationValues();
    this.logger.info('RhythmicMovementController configuration updated');
  }

  /**
   * Get current movement statistics.
   */
  public getStats(): {
    isRunning: boolean;
    currentIntensity: number;
    updatesPerformed: number;
    averageUpdateTime: number;
  } {
    return {
      isRunning: this.isRunning(),
      currentIntensity: this.currentIntensity,
      updatesPerformed: this.updatesPerformed,
      averageUpdateTime: this.updatesPerformed > 0 ? this.totalUpdateTime / this.updatesPerformed : 0
    };
  }

  /**
   * Get current BPM value
   */
  public getCurrentBPM(): number {
    return this.bpm;
  }

  /**
   * Get current beat number
   */
  public getCurrentBeat(): number {
    return this.beatNumber;
  }

  /**
   * Check if the system is currently playing (not paused)
   */
  public isPlaying(): boolean {
    return this.gameIsPlaying;
  }

  // ==================== MISSING METHODS IMPLEMENTATION (DIRECTIVA 2) ====================

  /**
   * Record player performance for a specific action
   */
  @logMethod()
  @catchError()
  public async recordPlayerPerformance(action: string, timestamp: number, accuracy: number): Promise<void> {
    this.logger.debug('Recording player performance', { action, timestamp, accuracy });
    
    // Implementation: Store performance metrics for analysis
    const performance = {
      action,
      timestamp,
      accuracy,
      beatNumber: this.beatNumber,
      timingDeviation: timestamp - this.lastBeatTime
    };

    // Emit performance event for other systems to consume
    this.eventBus.emit({
      type: 'PlayerAction',
      action: action,
      timestamp: new Date(timestamp),
      data: performance
    } as PlayerActionEvent);
  }

  /**
   * Set custom beat pattern for rhythm gameplay
   */
  @logMethod()
  @catchError()
  public async setCustomBeatPattern(patternName: string, pattern: number[]): Promise<void> {
    this.logger.info('Setting custom beat pattern', { patternName, pattern });
    
    // Validate pattern array
    if (!Array.isArray(pattern) || pattern.length === 0) {
      this.logger.warn('Invalid beat pattern provided', { pattern });
      return;
    }

    // Store custom pattern (in production, this would persist to storage)
    const customPattern = {
      name: patternName,
      pattern: pattern.map(beat => Number.isInteger(beat) && beat >= 0 ? beat : 0),
      bpm: this.bpm
    };

    this.logger.debug('Custom beat pattern configured', customPattern);
  }

  /**
   * Sync with audio context for precise timing
   */
  @logMethod()
  @catchError()
  public async syncWithAudio(audioContext: AudioContext | null): Promise<void> {
    if (!audioContext) {
      this.logger.error('Invalid audio context provided for sync');
      return;
    }

    try {
      // Sync internal timing with audio context current time
      const audioTime = audioContext.currentTime;
      const syncOffset = audioTime * 1000; // Convert to milliseconds
      
      this.logger.info('Syncing with audio context', { audioTime, syncOffset });
      
      // Adjust internal timing if necessary
      this.lastBeatTime = performance.now() - syncOffset;
      
    } catch (error) {
      this.logger.error('Failed to sync with audio context', { error });
    }
  }

  /**
   * Check synchronization accuracy with current audio timing
   */
  @logMethod()
  @catchError()
  public async checkSyncAccuracy(currentTime: number): Promise<number> {
    if (!Number.isFinite(currentTime)) {
      this.logger.warn('Invalid time provided for sync check, using current time');
      currentTime = performance.now();
    }

    const timeSinceLastBeat = currentTime - this.lastBeatTime;
    const expectedBeatTime = this.beatInterval;
    const accuracy = Math.max(0, 1 - Math.abs(timeSinceLastBeat - expectedBeatTime) / expectedBeatTime);
    
    this.logger.debug('Sync accuracy calculated', { 
      timeSinceLastBeat, 
      expectedBeatTime, 
      accuracy 
    });
    
    return accuracy;
  }

  /**
   * Analyze audio data for beat detection
   */
  @logMethod()
  @catchError()
  public async analyzeAudioForBeat(audioData: Float32Array): Promise<boolean> {
    if (!audioData || audioData.length === 0) {
      this.logger.warn('Invalid audio data provided for beat analysis');
      return false;
    }

    // Simple beat detection based on amplitude analysis
    const avgAmplitude = Array.from(audioData).reduce((sum, val) => sum + Math.abs(val), 0) / audioData.length;
    const threshold = 0.5; // Configuration-driven threshold would be better
    
    const beatDetected = avgAmplitude > threshold;
    
    this.logger.debug('Audio beat analysis completed', { avgAmplitude, threshold, beatDetected });
    
    return beatDetected;
  }

  /**
   * Start beat tracking for the current session
   */
  @logMethod()
  @catchError()
  public async startBeatTracking(): Promise<void> {
    this.logger.info('Starting beat tracking');
    
    // Reset beat tracking state
    this.beatNumber = 0;
    this.lastBeatTime = performance.now();
    
    // Start metronome if not already running
    if (!this.metronomeIntervalId) {
      this.startMetronome();
    }
  }

  /**
   * Get upcoming movement predictions
   */
  @logMethod()
  @catchError()
  public async getUpcomingMovements(count: number = 4): Promise<string[]> {
    this.logger.debug('Generating upcoming movement predictions', { count });
    
    const movements = ['dash', 'attack', 'defense', 'special'];
    const upcoming: string[] = [];
    
    for (let i = 0; i < count; i++) {
      // Simple pattern-based prediction (in production, would use AI/ML)
      const movementIndex = (this.beatNumber + i) % movements.length;
      upcoming.push(movements[movementIndex]);
    }
    
    return upcoming;
  }

  /**
   * Predict optimal timing for a specific action
   */
  @logMethod()
  @catchError()
  public async predictOptimalTiming(action: string): Promise<{ nextBeat: number; confidence: number }> {
    this.logger.debug('Predicting optimal timing', { action });
    
    const nextBeatTime = this.lastBeatTime + this.beatInterval;
    const confidence = this.gameIsPlaying ? 0.85 : 0.5;
    
    return {
      nextBeat: nextBeatTime,
      confidence
    };
  }

  /**
   * Calculate difficulty score for a movement sequence
   */
  @logMethod()
  @catchError()
  public async calculateSequenceDifficulty(sequence: string[]): Promise<number> {
    if (!sequence || sequence.length === 0) {
      return 0;
    }

    this.logger.debug('Calculating sequence difficulty', { sequence });
    
    // Simple difficulty calculation based on sequence complexity
    const baseComplexity = sequence.length * 0.1;
    const varietyBonus = new Set(sequence).size * 0.05;
    const difficultyScore = Math.min(1, baseComplexity + varietyBonus);
    
    return difficultyScore;
  }
}
