import { EventBus, PlayerActionEvent } from './EventBus';
import { logMethod, catchError } from '../utils/decorators';
import { QualiaLogger, LoggerProvider } from './Logger';

export interface RhythmicDashEvent {
  type: 'RhythmicDash';
  direction: 'north' | 'south' | 'east' | 'west';
  timing: 'perfect' | 'good' | 'miss';
  newPosition: [number, number];
  timestamp: number;
}

export interface MetronomeTickEvent {
  type: 'MetronomeTick';
  beatNumber: number;
  bpm: number;
  timestamp: number;
}

// PURE DI: Configuration interface for this service
export interface RhythmicMovementConfig {
  bpm: number;
  perfectTiming: number;
  goodTiming: number;
  gridSize: number;
  slowdownFactor: number;
  slowdownDuration: number; // Add missing property
}

/**
 * RhythmicMovementController - Core rhythm game logic
 * QUALIA.CODE v6: Pure Dependency Injection - Receives configuration directly
 */
export class RhythmicMovementController {
  private eventBus: EventBus;
  private logger: QualiaLogger;
  private config: RhythmicMovementConfig; // DIRECT INJECTION - NO SERVICE LOCATION
  
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
  private slowdownFactor!: number;
  private slowdownTimeout: number | null = null;
  private gameStateListenerId: string | null = null;

  constructor(
    eventBus: EventBus, 
    logger: QualiaLogger, 
    config: RhythmicMovementConfig // PURE DI: Receive specific config, not service
  ) {
    this.eventBus = eventBus;
    this.logger = logger || LoggerProvider.getLogger();
    this.config = config;
    
    // Load configuration from injected config - NO HARDCODED DEFAULTS
    this.loadConfigurationValues();
    this.beatInterval = (60 / this.bpm) * 1000; // Convert BPM to milliseconds
    
    this.logger.info("Controller initialized with configuration");
  }

  /**
   * PURE DI: Load values from injected configuration object
   */
  private loadConfigurationValues(): void {
    this.bpm = this.config.bpm;
    this.perfectTiming = this.config.perfectTiming;
    this.goodTiming = this.config.goodTiming;
    this.gridSize = this.config.gridSize;
    this.slowdownFactor = this.config.slowdownFactor;
  }

  @logMethod()
  @catchError()
  public start(): void {
    if (this.isListening) {
      this.logger.warn('RhythmicMovementController already started');
      return;
    }

    this.setupKeyboardListeners();
    this.setupGameStateListener();
    this.startMetronome();
    this.isListening = true;
    this.logger.info('🎵 RhythmicMovementController started');
  }

  @logMethod()
  @catchError()
  public stop(): void {
    if (!this.isListening) {
      this.logger.warn('RhythmicMovementController not running');
      return;
    }

    this.removeKeyboardListeners();
    this.removeGameStateListener();
    this.stopMetronome();
    this.isListening = false;
    this.logger.info('🎵 RhythmicMovementController stopped');
  }

  private setupGameStateListener(): void {
    // Listen for game state changes to handle pause/resume
    this.gameStateListenerId = this.eventBus.subscribe<any>('GameStateChanged', (event) => {
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
  private handleGameStateChange(event: any): void {
    const newState = event.newState;
    
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
      this.eventBus.emit<any>({
        type: 'MetronomeTick',
        beatNumber: this.beatNumber,
        bpm: this.bpm * this.slowdownFactor, // Affected by slowdown
        timestamp: this.lastBeatTime
      });
    }, this.beatInterval / this.slowdownFactor); // Adjust interval based on slowdown
  }

  private stopMetronome(): void {
    if (this.metronomeIntervalId) {
      clearInterval(this.metronomeIntervalId);
      this.metronomeIntervalId = null;
    }
  }

  private setupKeyboardListeners(): void {
    document.addEventListener('keydown', this.handleKeyDown);
  }

  private removeKeyboardListeners(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    // const config = this.configurationService.getConfig();
    // const keyThrottleMs = config.services.rhythmicMovement.keyThrottleMs;
    
    // Use dynamic throttle from config
    // Note: This is a simplified approach - in production you'd need a more sophisticated throttling mechanism
    const direction = this.getDirectionFromKey(event.key);
    if (!direction) return;

    event.preventDefault();
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
    // Don't process input when paused
    if (this.isPaused) {
      this.logger.debug('🚫 Input ignored - game is paused');
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
    this.eventBus.emit<any>({
      type: 'RhythmicDash',
      direction,
      timing,
      newPosition,
      timestamp: currentTime
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
}
