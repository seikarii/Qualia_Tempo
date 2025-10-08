/**
 * HIGH-FIDELITY MOCK: IGameStateStreamingService
 * QUALIA.CODE v1.1 - Phase 6.3: Testing & Validation
 * 
 * PURPOSE: High-fidelity mock for GameStateStreamingService (WebSocket client for CombatState)
 * 
 * COMPLIANCE:
 * - All methods return type-safe defaults (no bare vi.fn())
 * - Implements complete IGameStateStreamingService interface
 * - Ready for test assertions and verification
 */

import { vi } from 'vitest';
import type { IGameStateStreamingService, GameStateConnectionStatus } from '../../services/interfaces/IGameStateStreamingService';
import type { CombatState } from '../../types/CombatState';

export const mockGameStateStreamingService: IGameStateStreamingService = {
  // Connection management
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  isConnected: vi.fn().mockReturnValue(false),
  
  // Connection status
  getConnectionStatus: vi.fn().mockReturnValue({
    connected: false,
    state: 'IDLE',
    url: '',
    connectedAt: undefined,
    reconnectAttempts: 0,
    lastCombatStateTimestamp: undefined
  } as GameStateConnectionStatus),
  
  // State access
  getLatestCombatState: vi.fn().mockReturnValue(null),
  
  // Statistics
  getStatistics: vi.fn().mockReturnValue({
    messagesReceived: 0,
    messagesPerSecond: 0,
    averageLatency: 0,
    lastMessageTimestamp: null,
    uptime: 0,
    connectionDrops: 0
  }),
  
  // Lifecycle (from IBaseService)
  initialize: vi.fn().mockResolvedValue(undefined),
  destroy: vi.fn().mockResolvedValue(undefined),
  
  // Service status
  isEnabled: vi.fn().mockReturnValue(true),
  getServiceStatus: vi.fn().mockReturnValue({
    isEnabled: true,
    isInitialized: true,
    lastError: null,
    statistics: {}
  })
};
