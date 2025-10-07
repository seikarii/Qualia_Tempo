/**
 * QUALIA.CODE v1.1 - Worker Message Protocol
 * 
 * Defines the message types for communication between the main thread
 * and the QualiaCalculator Web Worker.
 * 
 * Architecture:
 * - Type-safe message protocol
 * - Serializable data structures only
 * - No dependencies on IoC or decorators
 * - Clear separation of concerns
 * 
 * CRITICAL: All types must be JSON-serializable (no functions, no circular refs)
 */

import type { QualiaState } from '../../types/contracts';
import type { PlayerActionEvent } from '../../services/contracts/events.contracts';
import type { QualiaCalculatorConfig } from '../../services/contracts/IQualiaStateCalculatorService.contracts';

// ==================== INPUT MESSAGES (Main → Worker) ====================

/**
 * Initialize the worker with configuration.
 * Must be the first message sent to a new worker.
 */
export interface WorkerInitMessage {
  type: 'INIT';
  config: QualiaCalculatorConfig;
  initialState?: QualiaState;
  timestamp: number;
}

/**
 * Process a player action event.
 * Triggers state calculation based on player input.
 */
export interface WorkerPlayerActionMessage {
  type: 'PLAYER_ACTION';
  action: PlayerActionEvent;
  timestamp: number;
}

/**
 * Apply time-based decay to the state.
 * Sent periodically (typically on GameTick events).
 */
export interface WorkerGameTickMessage {
  type: 'GAME_TICK';
  deltaTime: number; // Time passed in seconds
  timestamp: number;
}

/**
 * Reset the worker state to initial values.
 */
export interface WorkerResetMessage {
  type: 'RESET';
  timestamp: number;
}

/**
 * Update the worker configuration at runtime.
 */
export interface WorkerUpdateConfigMessage {
  type: 'UPDATE_CONFIG';
  config: Partial<QualiaCalculatorConfig>;
  timestamp: number;
}

/**
 * Request the current state from the worker.
 * Worker will respond with WorkerStateResponse.
 */
export interface WorkerGetStateMessage {
  type: 'GET_STATE';
  timestamp: number;
}

/**
 * Request performance statistics from the worker.
 * Worker will respond with WorkerStatsResponse.
 */
export interface WorkerGetStatsMessage {
  type: 'GET_STATS';
  timestamp: number;
}

/**
 * Terminate the worker gracefully.
 */
export interface WorkerTerminateMessage {
  type: 'TERMINATE';
  timestamp: number;
}

/**
 * Union type of all possible input messages.
 */
export type WorkerInputMessage =
  | WorkerInitMessage
  | WorkerPlayerActionMessage
  | WorkerGameTickMessage
  | WorkerResetMessage
  | WorkerUpdateConfigMessage
  | WorkerGetStateMessage
  | WorkerGetStatsMessage
  | WorkerTerminateMessage;

// ==================== OUTPUT MESSAGES (Worker → Main) ====================

/**
 * Worker has been successfully initialized.
 */
export interface WorkerInitializedMessage {
  type: 'INITIALIZED';
  timestamp: number;
}

/**
 * New QualiaState calculated.
 * This is the primary output of the worker.
 */
export interface WorkerStateCalculatedMessage {
  type: 'STATE_CALCULATED';
  state: QualiaState;
  timestamp: number;
  calculationTime: number; // Time taken to calculate in ms
}

/**
 * Response to GET_STATE request.
 */
export interface WorkerStateResponseMessage {
  type: 'STATE_RESPONSE';
  state: QualiaState;
  timestamp: number;
}

/**
 * Response to GET_STATS request.
 */
export interface WorkerStatsResponseMessage {
  type: 'STATS_RESPONSE';
  stats: WorkerStats;
  timestamp: number;
}

/**
 * Log message from worker.
 * Worker cannot access main thread logger, so it sends log messages.
 */
export interface WorkerLogMessage {
  type: 'LOG';
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

/**
 * Error occurred in worker.
 */
export interface WorkerErrorMessage {
  type: 'ERROR';
  error: string;
  stack?: string;
  context?: Record<string, unknown>;
  timestamp: number;
}

/**
 * Worker is ready to be terminated.
 */
export interface WorkerTerminatedMessage {
  type: 'TERMINATED';
  timestamp: number;
}

/**
 * Union type of all possible output messages.
 */
export type WorkerOutputMessage =
  | WorkerInitializedMessage
  | WorkerStateCalculatedMessage
  | WorkerStateResponseMessage
  | WorkerStatsResponseMessage
  | WorkerLogMessage
  | WorkerErrorMessage
  | WorkerTerminatedMessage;

// ==================== STATISTICS ====================

/**
 * Performance statistics from the worker.
 */
export interface WorkerStats {
  isRunning: boolean;
  calculationsPerformed: number;
  averageCalculationTime: number; // in milliseconds
  totalCalculationTime: number; // in milliseconds
  messagesReceived: number;
  messagesSent: number;
  errors: number;
  lastCalculationTime?: number;
  uptime: number; // Worker uptime in milliseconds
  currentState: QualiaState;
}

// ==================== TYPE GUARDS ====================

/**
 * Type guard for WorkerInputMessage.
 */
export function isWorkerInputMessage(message: unknown): message is WorkerInputMessage {
  if (typeof message !== 'object' || message === null) {
    return false;
  }
  
  const msg = message as Record<string, unknown>;
  return typeof msg.type === 'string' && typeof msg.timestamp === 'number';
}

/**
 * Type guard for WorkerOutputMessage.
 */
export function isWorkerOutputMessage(message: unknown): message is WorkerOutputMessage {
  if (typeof message !== 'object' || message === null) {
    return false;
  }
  
  const msg = message as Record<string, unknown>;
  return typeof msg.type === 'string' && typeof msg.timestamp === 'number';
}

/**
 * Type guard for WorkerStateCalculatedMessage.
 */
export function isStateCalculatedMessage(message: WorkerOutputMessage): message is WorkerStateCalculatedMessage {
  return message.type === 'STATE_CALCULATED';
}

/**
 * Type guard for WorkerLogMessage.
 */
export function isLogMessage(message: WorkerOutputMessage): message is WorkerLogMessage {
  return message.type === 'LOG';
}

/**
 * Type guard for WorkerErrorMessage.
 */
export function isErrorMessage(message: WorkerOutputMessage): message is WorkerErrorMessage {
  return message.type === 'ERROR';
}
