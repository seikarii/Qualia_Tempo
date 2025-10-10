/**
 * QUALIA.CODE v1.1 - Qualia Calculator Web Worker
 * 
 * Web Worker that runs QualiaState calculations off the main thread.
 * Maintains ARCHITECTURE.GOLD.CODE compliance: DOMINIO 2 (Web Worker).
 * 
 * Architecture:
 * - Runs in separate thread from UI
 * - Message-based communication with main thread
 * - No direct access to DOM, EventBus, or IoC container
 * - Pure calculation worker using QualiaCalculatorCore
 * 
 * Performance Benefits:
 * - Non-blocking UI thread
 * - Parallel computation
 * - Instant visual feedback through predictive calculations
 * 
 * CRITICAL: This file runs in Web Worker context, not main thread.
 */

import { QualiaCalculatorCore } from './QualiaCalculatorCore';
import type {
  WorkerInputMessage,
  WorkerOutputMessage,
  WorkerStats,
} from './types/worker-messages';

// Worker-global state
let core: QualiaCalculatorCore | null = null;
let isInitialized = false;

// Statistics
let messagesReceived = 0;
let messagesSent = 0;
let errors = 0;

/**
 * Logger callback that sends log messages to main thread.
 */
function workerLogger(
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  data?: Record<string, unknown>
): void {
  const logMessage: WorkerOutputMessage = {
    type: 'LOG',
    level,
    message,
    data,
    timestamp: performance.now(),
  };
  
  self.postMessage(logMessage);
  messagesSent++;
}

/**
 * Send an error message to main thread.
 */
function sendError(error: Error, context?: Record<string, unknown>): void {
  const errorMessage: WorkerOutputMessage = {
    type: 'ERROR',
    error: error.message,
    stack: error.stack,
    context,
    timestamp: performance.now(),
  };
  
  self.postMessage(errorMessage);
  messagesSent++;
  errors++;
}

/**
 * Handle initialization message.
 */
function handleInit(message: WorkerInputMessage): void {
  if (message.type !== 'INIT') return;

  try {
    core = new QualiaCalculatorCore(
      message.config,
      message.initialState,
      workerLogger
    );
    
    isInitialized = true;
    
    const response: WorkerOutputMessage = {
      type: 'INITIALIZED',
      timestamp: performance.now(),
    };
    
    self.postMessage(response);
    messagesSent++;
    
    workerLogger('info', '🚀 [Worker] Initialized successfully');
  } catch (error) {
    sendError(error as Error, { message: 'Failed to initialize worker' });
  }
}

/**
 * Handle player action message.
 */
function handlePlayerAction(message: WorkerInputMessage): void {
  if (message.type !== 'PLAYER_ACTION' || !core) return;

  try {
    const startTime = performance.now();
    const newState = core.processPlayerAction(message.action);
    const calculationTime = performance.now() - startTime;

    // Only emit if there's a significant change
    if (core.hasSignificantChange()) {
      const response: WorkerOutputMessage = {
        type: 'STATE_CALCULATED',
        state: newState,
        timestamp: performance.now(),
        calculationTime,
      };
      
      self.postMessage(response);
      messagesSent++;
    }
  } catch (error) {
    sendError(error as Error, { 
      message: 'Failed to process player action',
      action: message.action,
    });
  }
}

/**
 * Handle game tick message (time decay).
 */
function handleGameTick(message: WorkerInputMessage): void {
  if (message.type !== 'GAME_TICK' || !core) return;

  try {
    const startTime = performance.now();
    const newState = core.applyTimeDecay(message.deltaTime);
    const calculationTime = performance.now() - startTime;

    // Only emit if there's a significant change
    if (core.hasSignificantChange()) {
      const response: WorkerOutputMessage = {
        type: 'STATE_CALCULATED',
        state: newState,
        timestamp: performance.now(),
        calculationTime,
      };
      
      self.postMessage(response);
      messagesSent++;
    }
  } catch (error) {
    sendError(error as Error, { 
      message: 'Failed to process game tick',
      deltaTime: message.deltaTime,
    });
  }
}

/**
 * Handle reset message.
 */
function handleReset(_message: WorkerInputMessage): void {
  if (!core) return;

  try {
    const newState = core.reset();
    
    const response: WorkerOutputMessage = {
      type: 'STATE_CALCULATED',
      state: newState,
      timestamp: performance.now(),
      calculationTime: 0,
    };
    
    self.postMessage(response);
    messagesSent++;
    
    workerLogger('info', '🔄 [Worker] State reset');
  } catch (error) {
    sendError(error as Error, { message: 'Failed to reset state' });
  }
}

/**
 * Handle config update message.
 */
function handleUpdateConfig(message: WorkerInputMessage): void {
  if (message.type !== 'UPDATE_CONFIG' || !core) return;

  try {
    core.updateConfig(message.config);
    workerLogger('info', '⚙️ [Worker] Configuration updated');
  } catch (error) {
    sendError(error as Error, { 
      message: 'Failed to update configuration',
    });
  }
}

/**
 * Handle get state request.
 */
function handleGetState(_message: WorkerInputMessage): void {
  if (!core) return;

  try {
    const currentState = core.getCurrentState();
    
    const response: WorkerOutputMessage = {
      type: 'STATE_RESPONSE',
      state: currentState,
      timestamp: performance.now(),
    };
    
    self.postMessage(response);
    messagesSent++;
  } catch (error) {
    sendError(error as Error, { message: 'Failed to get state' });
  }
}

/**
 * Handle get stats request.
 */
function handleGetStats(_message: WorkerInputMessage): void {
  if (!core) return;

  try {
    const coreStats = core.getStats();
    
    const stats: WorkerStats = {
      isRunning: isInitialized,
      calculationsPerformed: coreStats.calculationsPerformed,
      averageCalculationTime: coreStats.averageCalculationTime,
      totalCalculationTime: coreStats.totalCalculationTime,
      messagesReceived,
      messagesSent,
      errors,
      uptime: coreStats.uptime,
      currentState: coreStats.currentState,
    };
    
    const response: WorkerOutputMessage = {
      type: 'STATS_RESPONSE',
      stats,
      timestamp: performance.now(),
    };
    
    self.postMessage(response);
    messagesSent++;
  } catch (error) {
    sendError(error as Error, { message: 'Failed to get stats' });
  }
}

/**
 * Handle terminate message.
 */
function handleTerminate(_message: WorkerInputMessage): void {
  try {
    core = null;
    isInitialized = false;
    
    const response: WorkerOutputMessage = {
      type: 'TERMINATED',
      timestamp: performance.now(),
    };
    
    self.postMessage(response);
    messagesSent++;
    
    workerLogger('info', '👋 [Worker] Terminated gracefully');
    
    // Close the worker
    self.close();
  } catch (error) {
    sendError(error as Error, { message: 'Failed to terminate worker' });
  }
}

/**
 * Main message handler.
 * Routes incoming messages to appropriate handlers.
 */
self.onmessage = (event: MessageEvent<WorkerInputMessage>) => {
  messagesReceived++;
  
  const message = event.data;
  
  // Log incoming message (debug level)
  workerLogger('debug', `[Worker] Received message: ${message.type}`);
  
  try {
    // Route to appropriate handler
    switch (message.type) {
      case 'INIT':
        handleInit(message);
        break;
      case 'PLAYER_ACTION':
        if (!isInitialized) {
          throw new Error('Worker not initialized. Send INIT message first.');
        }
        handlePlayerAction(message);
        break;
      case 'GAME_TICK':
        if (!isInitialized) {
          throw new Error('Worker not initialized. Send INIT message first.');
        }
        handleGameTick(message);
        break;
      case 'RESET':
        if (!isInitialized) {
          throw new Error('Worker not initialized. Send INIT message first.');
        }
        handleReset(message);
        break;
      case 'UPDATE_CONFIG':
        if (!isInitialized) {
          throw new Error('Worker not initialized. Send INIT message first.');
        }
        handleUpdateConfig(message);
        break;
      case 'GET_STATE':
        if (!isInitialized) {
          throw new Error('Worker not initialized. Send INIT message first.');
        }
        handleGetState(message);
        break;
      case 'GET_STATS':
        handleGetStats(message); // Stats available even before initialization
        break;
      case 'TERMINATE':
        handleTerminate(message);
        break;
      default:
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Unknown message type requires any for access
        workerLogger('warn', `[Worker] Unknown message type: ${(message as any).type}`);
    }
  } catch (error) {
    sendError(error as Error, { 
      message: 'Error processing message',
      messageType: message.type,
    });
  }
};

/**
 * Handle worker errors.
 */
self.onerror = (event: string | Event) => {
  if (typeof event === 'string') {
    sendError(new Error(event), {});
  } else if (event instanceof ErrorEvent) {
    sendError(new Error(event.message), {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  }
};

/**
 * Handle unhandled promise rejections.
 */
self.onunhandledrejection = (event: PromiseRejectionEvent) => {
  sendError(new Error(`Unhandled promise rejection: ${event.reason}`), {
    reason: event.reason,
  });
};

// Worker is ready
workerLogger('info', '✨ [Worker] QualiaCalculator Worker ready');
