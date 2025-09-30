import { injectable, inject } from "inversify";
import { TYPES } from "./inversify.types";
import type { 
  PlayerActionEvent, 
  GameStateChangedEvent,
  MetronomeTickEvent,
  RhythmicDashEvent,
} from "./contracts/events.contracts";
import { logMethod, catchError } from "../utils/decorators";
import type { QualiaState } from "../types/contracts";
import type { RhythmicMovementConfig } from "./contracts/IRhythmicMovementController.contracts";
import type { IRhythmicMovementController } from "./interfaces/IRhythmicMovementController";
import type { IEventBus } from "./interfaces/IEventBus";
import type { ILogger } from "./interfaces/ILogger";
import type { ITimerService } from "./interfaces/ITimerService";
import type { IMessageAdapter } from "./protocol/IMessageAdapter";
import type { IInputStateService } from "./interfaces/IInputStateService";
import type { IGameStateStoreService } from "./interfaces/IGameStateStoreService";
import type { IGameplayMechanicsService } from "./interfaces/IGameplayMechanicsService";

/**
 * RhythmicMovementController - Core rhythm game logic
 * QUALIA.CODE v7: InversifyJS Compliant - Uses ConfigurationService for settings
 */
@injectable()
export class RhythmicMovementController implements IRhythmicMovementController {
  private eventBus: IEventBus;
  private logger: ILogger;
  private config: RhythmicMovementConfig;
  private timerService: ITimerService;
  private keyAdapter: IMessageAdapter; // Used by @AdaptAndEmit decorator (DEPRECATED)
  private inputStateService: IInputStateService; // NUEVA FUENTE DE VERDAD
  private gameStateStore: IGameStateStoreService;
  private gameplayMechanicsService: IGameplayMechanicsService;

  private playerPosition!: [number, number]; // Will be initialized from config in loadConfigurationValues
  private isListening: boolean = false;
  private hasMovedThisBeat: boolean = false; // Movement lock for one move per beat

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

  // QUALIA.CODE: Throttling eliminado - El sondeo de estado es inherentemente controlado

  // Interface implementation properties
  private currentIntensity: number = 0.5;
  private updatesPerformed: number = 0;
  private totalUpdateTime: number = 0;

  constructor(
    @inject(TYPES.IEventBus) eventBus: IEventBus,
    @inject(TYPES.ILogger) logger: ILogger,
    @inject(TYPES.RhythmicMovementConfig) config: RhythmicMovementConfig,
    @inject(TYPES.ITimerService) timerService: ITimerService,
    @inject(TYPES.IKeyToDirectionAdapter) keyAdapter: IMessageAdapter,
    @inject(TYPES.IInputStateService) inputStateService: IInputStateService,
    @inject(TYPES.IGameStateStoreService) gameStateStore: IGameStateStoreService,
    @inject(TYPES.IGameplayMechanicsService) gameplayMechanicsService: IGameplayMechanicsService,
  ) {
    this.eventBus = eventBus;
    this.logger = logger;
    this.config = config;
    this.timerService = timerService;
    this.keyAdapter = keyAdapter;
    this.inputStateService = inputStateService;
    this.gameStateStore = gameStateStore;
    this.gameplayMechanicsService = gameplayMechanicsService;
    // Ensure keyAdapter is used by decorator (TypeScript workaround) - DEPRECATED
    void this.keyAdapter;

    this.logger.info(this.config.messages.serviceInitialized);
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
    // QUALIA.CODE: keyThrottleMs eliminado - No necesario en modelo de sondeo

    // Initialize playerPosition from gridSize and optional offset
    this.playerPosition = [
      this.config.gridSize / 2 + (this.config.initialPlayerPositionOffset?.[0] || 0),
      this.config.gridSize / 2 + (this.config.initialPlayerPositionOffset?.[1] || 0)
    ];
  }

  @logMethod
  @catchError
  public start(): void {
    if (this.isListening) {
      this.logger.warn("RhythmicMovementController already started");
      return;
    }

    // QUALIA.CODE: Configuration is now injected directly via constructor
    this.loadConfigurationValues();
    this.beatInterval = (60 / this.bpm) * 1000; // Convert BPM to milliseconds

    this.setupInputListener();
    this.setupGameStateListener();
    this.startMetronome();
    this.isListening = true;
    this.logger.info("RhythmicMovementController started successfully");
  }

  @logMethod
  @catchError
  public stop(): void {
    if (!this.isListening) {
      this.logger.warn("RhythmicMovementController not running");
      return;
    }

    this.removeInputListener();
    this.removeGameStateListener();
    this.stopMetronome();
    this.isListening = false;
    this.logger.info("🎵 RhythmicMovementController stopped");
  }

  private setupGameStateListener(): void {
    // Listen for game state changes to handle pause/resume
    this.gameStateListenerId = this.eventBus.subscribe<GameStateChangedEvent>(
      "GameStateChanged",
      (event) => {
        this.handleGameStateChange(event);
      },
    );
  }

  private removeGameStateListener(): void {
    if (this.gameStateListenerId) {
      this.eventBus.unsubscribe(this.gameStateListenerId);
      this.gameStateListenerId = null;
    }
  }

  @logMethod
  private handleGameStateChange(event: GameStateChangedEvent): void {
    const newState = event.newState;

    // Update playing state
    this.gameIsPlaying = newState === "Playing";

    if (newState === "Paused") {
      this.activatePauseWithSlowdown();
    } else if (newState === "Playing" && this.isPaused) {
      this.resumeFromPause();
    }
  }

  @logMethod
  private activatePauseWithSlowdown(): void {
    const slowdownDuration = this.config.slowdownDuration;
    const slowdownFactor = this.config.slowdownFactor;

    this.logger.info(
      `Activating pause with ${slowdownDuration}ms slowdown effect`,
    );

    // Set slowdown factor
    this.slowdownFactor = slowdownFactor;
    this.isPaused = true;

    // Apply slowdown effect for configured duration, then fully pause
    this.slowdownTimeout = this.timerService.setTimeout(() => {
      this.slowdownFactor = 0.0; // Complete pause
      this.stopMetronome();
      this.logger.info("Transitioning to full pause");
    }, slowdownDuration);
  }

  @logMethod
  private resumeFromPause(): void {
    this.logger.info("▶️ Resuming from pause");

    // Clear slowdown timeout if still active
    if (this.slowdownTimeout) {
      this.timerService.clearTimeout(this.slowdownTimeout);
      this.slowdownTimeout = null;
    }

    // Reset to normal speed
    this.slowdownFactor = 1.0;
    this.isPaused = false;

    // Restart metronome
    this.startMetronome();
  }

  @logMethod
  private startMetronome(): void {
    this.metronomeIntervalId = this.timerService.setInterval(() => {
      // Skip metronome ticks when completely paused
      if (this.slowdownFactor === 0.0) {
        return;
      }

      this.beatNumber++;
      this.lastBeatTime = this.timerService.now();

      // Reset movement lock for new beat
      this.hasMovedThisBeat = false;

        // Emit metronome tick event with slowdown factor
      this.eventBus.emit<MetronomeTickEvent>({
        type: "MetronomeTick",
        beatNumber: this.beatNumber,
        bpm: this.bpm * this.slowdownFactor, // Affected by slowdown
        source: "RhythmicMovementController",
      });
      
      // QUALIA.CODE: Sondeo de estado de entrada en cada tick del juego
      this.processMovementFromState();
      this.processActionInputFromState();
    }, this.beatInterval / this.slowdownFactor); // Adjust interval based on slowdown
  }

  private stopMetronome(): void {
    if (this.metronomeIntervalId) {
      this.timerService.clearInterval(this.metronomeIntervalId);
      this.metronomeIntervalId = null;
    }
  }

  private setupInputListener(): void {
    // QUALIA.CODE: Modelo de sondeo de estado - Sin suscripciones a eventos de entrada
    // El sondeo se realiza en el bucle del metronome
    this.logger.info('🎮 Input system migrated to state polling model');
  }

  private removeInputListener(): void {
    // In an event-driven system, you might not need to manually remove listeners
    // if the EventBus handles lifecycle management. However, if you have specific
    // listener IDs, you would unsubscribe here.
  }

  // MÉTODO ELIMINADO: onPlayerInput - Reemplazado por sondeo de estado

  // MÉTODO ELIMINADO: handleDirectionInput - Reemplazado por processMovementFromState

  @logMethod
  private processDashInput(
    direction: "north" | "south" | "east" | "west" | "northeast" | "northwest" | "southeast" | "southwest",
  ): void {
    // Don't process input when paused OR when game is not playing
    if (this.isPaused || !this.isGameActive()) {
      this.logger.debug("🚫 Input ignored - game is paused or not active");
      return;
    }

    const currentTime = this.timerService.now();
    const timeSinceLastBeat = currentTime - this.lastBeatTime;
    const nextBeatTime = this.beatInterval - timeSinceLastBeat;

    // Calculate timing accuracy
    const timing = this.calculateTiming(
      Math.min(timeSinceLastBeat, nextBeatTime),
    );

    // Calculate new position
    const newPosition = this.calculateNewPosition(direction);

    // VALIDATE POSITION FIRST - Critical fix for bounds checking
    if (!this.isValidPosition(newPosition)) {
      this.logger.debug("🚫 Movement blocked - invalid position (out of bounds)", { newPosition });
      // Optional: Emit collision event for UI feedback
      return; // Exit early - no event emission, no state update
    }

    // Position is valid - proceed with movement
    this.eventBus.emit<RhythmicDashEvent>({
      type: "RhythmicDash",
      direction,
      timing,
      newPosition,
      source: "RhythmicMovementController",
    });

    // Update player position (now guaranteed to be valid)
    this.playerPosition = newPosition;

    // Set movement lock to prevent multiple moves per beat
    this.hasMovedThisBeat = true;
  }

  private calculateTiming(timingOffset: number): "perfect" | "good" | "miss" {
    if (timingOffset <= this.perfectTiming) {
      return "perfect";
    } else if (timingOffset <= this.goodTiming) {
      return "good";
    } else {
      return "miss";
    }
  }

  private calculateNewPosition(
    direction: "north" | "south" | "east" | "west" | "northeast" | "northwest" | "southeast" | "southwest",
  ): [number, number] {
    const [x, z] = this.playerPosition;

    switch (direction) {
      case "north":     return [x, z - 1]; // 'W' moves north (negative Z)
      case "south":     return [x, z + 1]; // 'S' moves south (positive Z)
      case "east":      return [x + 1, z]; // 'D' moves east (positive X)
      case "west":      return [x - 1, z]; // 'A' moves west (negative X)
      case "northeast": return [x + 1, z - 1];
      case "northwest": return [x - 1, z - 1];
      case "southeast": return [x + 1, z + 1];
      case "southwest": return [x - 1, z + 1];
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

  /**
   * QUALIA.CODE: Nuevo método de sondeo de estado para movimiento simultáneo
   * Convierte el vector de dirección del InputStateService a una dirección nominal
   * y procesa el movimiento si hay entrada activa.
   */
  @logMethod
  private processMovementFromState(): void {
    // Check movement lock - only one move per beat allowed
    if (this.hasMovedThisBeat) {
      return; // Already moved this beat, ignore additional input
    }

    const directionVector = this.inputStateService.getDirectionVector();

    // No hacer nada si no hay movimiento
    if (directionVector.x === 0 && directionVector.z === 0) {
      return;
    }

    // Convertir el vector a una dirección nominal (8 direcciones)
    let direction: 'north' | 'south' | 'east' | 'west' | 'northeast' | 'northwest' | 'southeast' | 'southwest';

    // LÓGICA CORREGIDA: z controla north/south, x controla east/west
    if (directionVector.z === -1 && directionVector.x === 0) {
      direction = 'north';
    } else if (directionVector.z === 1 && directionVector.x === 0) {
      direction = 'south';
    } else if (directionVector.x === 1 && directionVector.z === 0) {
      direction = 'east';
    } else if (directionVector.x === -1 && directionVector.z === 0) {
      direction = 'west';
    } else if (directionVector.z === -1 && directionVector.x === 1) {
      direction = 'northeast';
    } else if (directionVector.z === -1 && directionVector.x === -1) {
      direction = 'northwest';
    } else if (directionVector.z === 1 && directionVector.x === 1) {
      direction = 'southeast';
    } else if (directionVector.z === 1 && directionVector.x === -1) {
      direction = 'southwest';
    } else {
      // Vector inválido - no debería ocurrir
      this.logger.warn('Invalid direction vector', { directionVector });
      return;
    }

    // Procesar el movimiento con la dirección calculada
    this.processDashInput(direction);
  }

  /**
   * QUALIA.CODE: Nuevo método de sondeo de estado para acciones rítmicas
   * Centraliza toda la lógica de HitNote/MissNote en el bucle de juego
   */
  @logMethod
  private processActionInputFromState(): void {
    // Lógica para evitar spam de eventos si la tecla se mantiene pulsada
    const wasActionPressed = this.inputStateService.wasActionJustPressed(' ');
    if (!wasActionPressed) return;

    const gameState = this.gameStateStore.getGameState();
    const currentTime = this.timerService.now();

    // Usar el GameplayMechanicsService para encontrar la nota más cercana
    const nearestNote = this.gameplayMechanicsService.findNearestNote(gameState.combatData.noteMap, currentTime);
    if (!nearestNote) {
      this.eventBus.emit({
        type: 'PlayerAction',
        action: 'MissNote',
        context: { reason: 'no_notes_available' },
        timestamp: new Date()
      } as PlayerActionEvent);
      return;
    }

    // Usar el GameplayMechanicsService para el cálculo de precisión
    const accuracy = this.gameplayMechanicsService.calculateNoteAccuracy(currentTime, nearestNote.timestamp);
    const hitResult = this.gameplayMechanicsService.determineHitResult(accuracy);

    if (hitResult === 'miss') {
      this.eventBus.emit({
        type: 'PlayerAction',
        action: 'MissNote',
        context: { noteId: nearestNote.id, reason: 'poor_timing' },
        timestamp: new Date()
      } as PlayerActionEvent);
    } else {
      const score = this.gameplayMechanicsService.calculateScoreForHit(accuracy);
      this.eventBus.emit({
        type: 'PlayerAction',
        action: 'HitNote',
        context: { accuracy, result: hitResult, score },
        timestamp: new Date()
      } as PlayerActionEvent);
    }
  }

  // ==================== IRhythmicMovementController INTERFACE IMPLEMENTATION ====================

  /**
   * Update movement based on QualiaState.
   */
  @logMethod
  @catchError
  public updateMovement(qualiaState: QualiaState): void {
    const startTime = performance.now();

    // Update internal state based on qualia
    this.currentIntensity = qualiaState.intensity;

    // Update BPM based on flow and intensity
    const dynamicBPM = this.config.bpm * (1 + qualiaState.flow * this.config.flowBpmMultiplier);
    this.setBPM(dynamicBPM);

    // Track performance metrics
    this.updatesPerformed++;
    this.totalUpdateTime += performance.now() - startTime;

    this.logger.debug("Movement updated based on QualiaState", {
      intensity: qualiaState.intensity,
      flow: qualiaState.flow,
      newBPM: dynamicBPM,
    });
  }

  /**
   * Set the intensity of rhythmic movement.
   */
  @logMethod
  @catchError
  public setIntensity(intensity: number): void {
    this.currentIntensity = Math.max(0, Math.min(1, intensity));
    this.logger.debug("Movement intensity set", {
      intensity: this.currentIntensity,
    });
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
  @logMethod
  @catchError
  public updateConfig(config: any): void {
    this.config = { ...this.config, ...config };
    this.loadConfigurationValues();
    this.logger.info("RhythmicMovementController configuration updated");
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
      averageUpdateTime:
        this.updatesPerformed > 0
          ? this.totalUpdateTime / this.updatesPerformed
          : 0,
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
  @logMethod
  @catchError
  public async recordPlayerPerformance(
    action: string,
    timestamp: number,
    accuracy: number,
  ): Promise<void> {
    this.logger.debug("Recording player performance", {
      action,
      timestamp,
      accuracy,
    });

    // Implementation: Store performance metrics for analysis
    const performance = {
      action,
      timestamp,
      accuracy,
      beatNumber: this.beatNumber,
      timingDeviation: timestamp - this.lastBeatTime,
    };

    // Emit performance event for other systems to consume
    this.eventBus.emit({
      type: "PlayerAction",
      action: action,
      timestamp: new Date(timestamp),
      data: performance,
    } as PlayerActionEvent);
  }

  /**
   * Set custom beat pattern for rhythm gameplay
   */
  @logMethod
  @catchError
  public async setCustomBeatPattern(
    patternName: string,
    pattern: number[],
  ): Promise<void> {
    this.logger.info("Setting custom beat pattern", { patternName, pattern });

    // Validate pattern array
    if (!Array.isArray(pattern) || pattern.length === 0) {
      this.logger.warn("Invalid beat pattern provided", { pattern });
      return;
    }

    // Store custom pattern (in production, this would persist to storage)
    const customPattern = {
      name: patternName,
      pattern: pattern.map((beat) =>
        Number.isInteger(beat) && beat >= 0 ? beat : 0,
      ),
      bpm: this.bpm,
    };

    this.logger.debug("Custom beat pattern configured", customPattern);
  }

  /**
   * Sync with audio context for precise timing
   */
  @logMethod
  @catchError
  public async syncWithAudio(audioContext: AudioContext | null): Promise<void> {
    if (!audioContext) {
      this.logger.error("Invalid audio context provided for sync");
      return;
    }

    try {
      // Sync internal timing with audio context current time
      const audioTime = audioContext.currentTime;
      const syncOffset = audioTime * 1000; // Convert to milliseconds

      this.logger.info("Syncing with audio context", { audioTime, syncOffset });

      // Adjust internal timing if necessary
      this.lastBeatTime = this.timerService.now() - syncOffset;
    } catch (error) {
      this.logger.error("Failed to sync with audio context", { error });
    }
  }

  /**
   * Check synchronization accuracy with current audio timing
   */
  @logMethod
  @catchError
  public async checkSyncAccuracy(currentTime: number): Promise<number> {
    if (!Number.isFinite(currentTime)) {
      const config = this.config;
      this.logger.warn(config.messages.invalidTimeWarning);
      currentTime = this.timerService.now();
    }

    const timeSinceLastBeat = currentTime - this.lastBeatTime;
    const expectedBeatTime = this.beatInterval;
    const accuracy = Math.max(
      0,
      1 - Math.abs(timeSinceLastBeat - expectedBeatTime) / expectedBeatTime,
    );

    this.logger.debug("Sync accuracy calculated", {
      timeSinceLastBeat,
      expectedBeatTime,
      accuracy,
    });

    return accuracy;
  }

  /**
   * Analyze audio data for beat detection
   */
  @logMethod
  @catchError
  public async analyzeAudioForBeat(audioData: Float32Array): Promise<boolean> {
    if (!audioData || audioData.length === 0) {
      this.logger.warn("Invalid audio data provided for beat analysis");
      return false;
    }

    // Simple beat detection based on amplitude analysis
    const avgAmplitude =
      Array.from(audioData).reduce((sum, val) => sum + Math.abs(val), 0) /
      audioData.length;
    const threshold = this.config.audioBeatDetectionThreshold;

    const beatDetected = avgAmplitude > threshold;

    this.logger.debug("Audio beat analysis completed", {
      avgAmplitude,
      threshold,
      beatDetected,
    });

    return beatDetected;
  }

  /**
   * Start beat tracking for the current session
   */
  @logMethod
  @catchError
  public async startBeatTracking(): Promise<void> {
    this.logger.info("Starting beat tracking");

    // Reset beat tracking state
    this.beatNumber = 0;
    this.lastBeatTime = this.timerService.now();

    // Start metronome if not already running
    if (!this.metronomeIntervalId) {
      this.startMetronome();
    }
  }

  /**
   * Get upcoming movement predictions
   */
  @logMethod
  @catchError
  public async getUpcomingMovements(count: number = 4): Promise<string[]> {
    this.logger.debug("Generating upcoming movement predictions", { count });

    const movements = this.config.availableMovements;
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
  @logMethod
  @catchError
  public async predictOptimalTiming(
    action: string,
  ): Promise<{ nextBeat: number; confidence: number }> {
    this.logger.debug("Predicting optimal timing", { action });

    const nextBeatTime = this.lastBeatTime + this.beatInterval;
    const confidence = this.gameIsPlaying
      ? this.config.optimalTimingPredictionConfidencePlaying
      : this.config.optimalTimingPredictionConfidenceNotPlaying;

    return {
      nextBeat: nextBeatTime,
      confidence,
    };
  }

  /**
   * Calculate difficulty score for a movement sequence
   */
  @logMethod
  @catchError
  public async calculateSequenceDifficulty(
    sequence: string[],
  ): Promise<number> {
    if (!sequence || sequence.length === 0) {
      return 0;
    }

    this.logger.debug("Calculating sequence difficulty", { sequence });

    // Simple difficulty calculation based on sequence complexity
    const baseComplexity = sequence.length * this.config.sequenceDifficultyBaseComplexityMultiplier;
    const varietyBonus = new Set(sequence).size * this.config.sequenceDifficultyVarietyBonusMultiplier;
    const difficultyScore = Math.min(1, baseComplexity + varietyBonus);

    return difficultyScore;
  }
}
