/**
 * QUALIA.CODE v1.1 - GameStateStreaming Configuration Validator
 * PHASE 6 TASK 6.1: Full System Integration
 */

import type { GameStateStreamingConfig } from '../contracts/IGameStateStreamingService.contracts';

/**
 * Validate GameStateStreamingConfig structure
 */
export function validateGameStateStreamingConfig(config: any): config is GameStateStreamingConfig {
  if (!config || typeof config !== 'object') {
    throw new Error('[GameStateStreaming] Configuration must be an object');
  }

  // Validate websocket configuration
  if (!config.websocket || typeof config.websocket !== 'object') {
    throw new Error('[GameStateStreaming] websocket configuration is required');
  }

  if (typeof config.websocket.url !== 'string' || !config.websocket.url) {
    throw new Error('[GameStateStreaming] websocket.url must be a non-empty string');
  }

  if (typeof config.websocket.maxReconnectAttempts !== 'number' || config.websocket.maxReconnectAttempts < 0) {
    throw new Error('[GameStateStreaming] websocket.maxReconnectAttempts must be a non-negative number');
  }

  if (typeof config.websocket.reconnectDelay !== 'number' || config.websocket.reconnectDelay < 0) {
    throw new Error('[GameStateStreaming] websocket.reconnectDelay must be a non-negative number');
  }

  if (typeof config.websocket.reconnectBackoffMultiplier !== 'number' || config.websocket.reconnectBackoffMultiplier < 1) {
    throw new Error('[GameStateStreaming] websocket.reconnectBackoffMultiplier must be >= 1');
  }

  if (typeof config.websocket.maxReconnectDelay !== 'number' || config.websocket.maxReconnectDelay < 0) {
    throw new Error('[GameStateStreaming] websocket.maxReconnectDelay must be a non-negative number');
  }

  if (typeof config.websocket.pingInterval !== 'number' || config.websocket.pingInterval < 0) {
    throw new Error('[GameStateStreaming] websocket.pingInterval must be a non-negative number');
  }

  if (typeof config.websocket.pingTimeout !== 'number' || config.websocket.pingTimeout < 0) {
    throw new Error('[GameStateStreaming] websocket.pingTimeout must be a non-negative number');
  }

  if (typeof config.websocket.normalCloseCode !== 'number') {
    throw new Error('[GameStateStreaming] websocket.normalCloseCode must be a number');
  }

  // Validate statistics configuration
  if (!config.statistics || typeof config.statistics !== 'object') {
    throw new Error('[GameStateStreaming] statistics configuration is required');
  }

  if (typeof config.statistics.trackLatency !== 'boolean') {
    throw new Error('[GameStateStreaming] statistics.trackLatency must be a boolean');
  }

  if (typeof config.statistics.latencySampleSize !== 'number' || config.statistics.latencySampleSize < 1) {
    throw new Error('[GameStateStreaming] statistics.latencySampleSize must be a positive number');
  }

  // Validate messages configuration
  if (!config.messages || typeof config.messages !== 'object') {
    throw new Error('[GameStateStreaming] messages configuration is required');
  }

  const requiredMessages = [
    'serviceInitialized',
    'connecting',
    'connected',
    'disconnected',
    'reconnecting',
    'maxReconnectAttemptsReached',
    'stateReceived',
    'pingFailed'
  ];

  for (const key of requiredMessages) {
    if (typeof config.messages[key] !== 'string') {
      throw new Error(`[GameStateStreaming] messages.${key} must be a string`);
    }
  }

  return true;
}
