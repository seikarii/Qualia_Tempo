/**
 * @generated DO NOT EDIT
 * QUALIA.CODE v1.1 - Event Data Contracts
 * Single source of truth for data structures used in EventBus events.
 * Eliminates circular dependencies between EventBus and service interfaces.
 */

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
  metadata?: Record<string, any>;
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
  context?: Record<string, any>;
  value?: number; // For scoreIncrease and other actions that need a value
}

export interface RhythmicDashEvent extends BaseEvent {
  type: "RhythmicDash";
  direction: "north" | "south" | "east" | "west";
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
