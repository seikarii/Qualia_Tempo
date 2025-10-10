/**
 * @generated DO NOT EDIT
 * QUALIA.CODE v1.1 - Event Data Contracts
 * Single source of truth for data structures used in EventBus events.
 * Eliminates circular dependencies between EventBus and service interfaces.
 */

import type { QualiaState } from "../../types/contracts";

// Moved from IStreamingVideoService.ts
export type ConnectionStateType =
  | "IDLE"
  | "CONNECTING"
  | "CONNECTED"
  | "DISCONNECTED"
  | "RECONNECTING"
  | "ERROR";

// Moved from IStreamingVideoService.ts
export interface ConnectionStatus {
  /** Whether WebSocket is connected */
  connected: boolean;
  /** Current connection state with detailed lifecycle */
  state: ConnectionStateType;
  /** Last error message if any */
  lastError?: string;
  /** Connection URL */
  url?: string;
  /** Time when connection was established */
  connectedAt?: Date;
  /** Number of reconnection attempts */
  reconnectAttempts: number;
}

// Moved from IStreamingVideoService.ts
export interface VideoFrame {
  /** Base64 encoded JPEG image data */
  data: string;
  /** Timestamp when frame was generated */
  timestamp: number;
  /** Sequential frame number */
  frameNumber: number;
  /** Frame width in pixels */
  width?: number;
  /** Frame height in pixels */
  height?: number;
}

// EventBus Event Type Definitions - Moved from EventBus.ts to eliminate direct service imports
export interface BaseEvent {
  type: string;
  timestamp: Date;
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface PlayerActionEvent extends BaseEvent {
  type: "PlayerAction";
  action:
    | "Dash"
    | "HitNote"
    | "MissNote"
    | "FastForward"
    | "Rewind"
    | "StartGame"
    | "PauseGame"
    | "ResetGame"
    | "scoreIncrease";
  context?: Record<string, unknown>;
  value?: number; // For scoreIncrease and other actions that need a value
}

export interface RhythmicDashEvent extends BaseEvent {
  type: "RhythmicDash";
  direction: "north" | "south" | "east" | "west" | "northeast" | "northwest" | "southeast" | "southwest";
  timing: "perfect" | "good" | "miss";
  newPosition: [number, number];
}

export interface MetronomeTickEvent extends BaseEvent {
  type: "MetronomeTick";
  beatNumber: number;
  bpm: number;
}

export interface GameStateChangedEvent extends BaseEvent {
  type: "GameStateChanged";
  newState: "Playing" | "Paused" | "GameOver" | "Menu";
  oldState: string;
  previousState: string;
}

export interface PlayerInputEvent extends BaseEvent {
  type: "PlayerInput";
  key: string;
  source?: string;
}

export interface PlayerDirectionEvent extends BaseEvent {
  type: "PlayerDirectionInput";
  direction: 'north' | 'south' | 'east' | 'west';
}

// ARCHITECTURE v1.1: Separated event types for different data sources
export interface QualiaStateCalculatedEvent extends BaseEvent {
  type: "QualiaStateCalculated";
  qualiaState: QualiaState; // Frontend-calculated game state from player actions
}

export interface QualiaParticleDataReceivedEvent extends BaseEvent {
  type: "QualiaParticleDataReceived";
  particleData: Float32Array; // BINARY PROTOCOL: Typed particle data from numpy.tobytes()
}

export interface ErrorEvent extends BaseEvent {
  type: "Error";
  error: Error;
  severity: "low" | "medium" | "high" | "critical";
  context?: Record<string, unknown>;
}

export interface BackendSyncEvent extends BaseEvent {
  type: "BackendSync";
  data: QualiaState | Record<string, unknown>;
  syncType: "qualiaState" | "gameState" | "config";
  status?: "success" | "error" | "pending";
  error?: Error | string;
}

export interface VisualImpactRequestedEvent extends BaseEvent {
  type: "VisualImpactRequested";
  payload: {
    x: number; // Normalized coordinates (0 to 1)
    y: number; // Normalized coordinates (0 to 1)
    intensity: number; // Impact intensity (0 to 1)
  };
}

export interface StreamingStatusChangedEvent extends BaseEvent {
  type: "StreamingStatusChanged";
  status: ConnectionStatus;
}

export interface ConfigurationLoadedEvent extends BaseEvent {
  type: "ConfigurationLoaded";
  loadedConfigs: string[]; // List of config files that were loaded
  totalConfigs: number; // Total number of config files expected
}

export interface SystemAudioReadyEvent extends BaseEvent {
  type: "System.Audio.Ready";
}

// QUALIA.CODE v1.1: WebGL Context Events for Platform Abstraction
export interface WebGLContextLostEvent extends BaseEvent {
  type: "WebGLContextLost";
  canvas: HTMLCanvasElement;
}

export interface WebGLContextRestoredEvent extends BaseEvent {
  type: "WebGLContextRestored";
  canvas: HTMLCanvasElement;
}

// QUALIA.CODE v1.1: Service Status Events for Decoupled Diagnostics
export interface ServiceStatusUpdateEvent extends BaseEvent {
  type: "ServiceStatusUpdate";
  serviceName: string;
  status: {
    isRunning: boolean;
    stats?: Record<string, unknown>;
    error?: string;
  };
}

// Moved from IDebugService.ts
export interface DebugEvent extends BaseEvent {
  data?: Record<string, unknown>;
}

// QUALIA.CODE v1.1: Game Loop Tick Event for Event-Driven State Updates
export interface GameTickEvent extends BaseEvent {
  type: "GameTick";
  deltaTime: number; // Time elapsed since last tick in seconds
  totalTime: number; // Total elapsed time since game start in seconds
}

// QUALIA.CODE v1.1: Combat Data Update Event for Reactive State Tracking
export interface CombatDataUpdatedEvent extends BaseEvent {
  type: "CombatDataUpdated";
  combatData: import("../../types/contracts").CombatData | null;
  source: string;
}

// QUALIA.CODE v2.0: Audio Analysis Event for Real-Time Audio Data
export interface AudioDataUpdatedEvent extends BaseEvent {
  type: "AudioDataUpdated";
  tempo: number; // Beats per minute
  beatPosition: number; // Position in current beat (0-1)
  frequencyBands: number[]; // Frequency analysis data (8 bands)
  volume: number; // Current volume level (0-1)
  source: string;
}

// QUALIA.CODE v2.0: Physics Data Event for Movement Simulation
export interface PhysicsDataUpdatedEvent extends BaseEvent {
  type: "PhysicsDataUpdated";
  velocity: {
    x: number;
    y: number;
    z: number;
  };
  acceleration: {
    x: number;
    y: number;
    z: number;
  };
  source: string;
}

// QUALIA.CODE v2.0: Input Events for Musical Interaction
export interface KeyPressedEvent extends BaseEvent {
  type: "Input.KeyPressed";
  key: string; // Normalized key (e.g., "Q", "E", "R")
  timestamp: Date;
  source: string;
}

// QUALIA.CODE v2.0: Entity Position Events for Spatial Audio
export interface EntityPositionUpdatedEvent extends BaseEvent {
  type: "Entity.PositionUpdated";
  entityId: string; // "player", "boss", or particle ID
  entityType: 'player' | 'boss' | 'particle';
  position: {
    x: number;
    y: number;
    z: number;
  };
  velocity?: {
    x: number;
    y: number;
    z: number;
  };
  source: string;
}

// QUALIA.CODE v2.0: Musical Combo Events
export interface ComboDetectedEvent extends BaseEvent {
  type: "Combo.Detected";
  comboId: string;
  comboType: 'harmonic' | 'chaotic' | 'neutral';
  effect: string;
  harmonicScore: number;
  keys: string[];
  source: string;
}

export interface ComboExpiredEvent extends BaseEvent {
  type: "Combo.Expired";
  comboId: string;
  source: string;
}

export interface SequenceClearedEvent extends BaseEvent {
  type: "Combo.SequenceCleared";
  reason: 'timeout' | 'manual' | 'combo-activated';
  source: string;
}

/**
 * PHASE 6 TASK 6.1: CombatState streaming event
 * Emitted when backend sends updated game state via WebSocket
 */
export interface CombatStateUpdatedEvent extends BaseEvent {
  type: "CombatStateUpdated";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- CombatState from shared_contracts to avoid circular dependency
  combatState: any; // CombatState from contracts
  backendTimestamp: number; // Original timestamp from backend
  latency?: number; // Time between backend send and frontend receive (ms)
  source: string;
}

/**
 * PHASE 6 TASK 6.3: Store updated event
 * Emitted when GameStateStoreService updates the Zustand store
 */
export interface GameStateStoreUpdatedEvent extends BaseEvent {
  type: "GameStateStoreUpdated";
  source: string;
}
