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
  particleData: ArrayBuffer; // BINARY PROTOCOL: Raw particle data from numpy.tobytes()
}

export interface ErrorEvent extends BaseEvent {
  type: "Error";
  error: Error;
  severity: "low" | "medium" | "high" | "critical";
  context?: Record<string, unknown>;
}

export interface BackendSyncEvent extends BaseEvent {
  type: "BackendSync";
  data: any;
  syncType: "qualiaState" | "gameState" | "config";
  status?: "success" | "error" | "pending";
  error?: any;
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

export interface SystemAudioReadyEvent extends BaseEvent {
  type: "System.Audio.Ready";
}
