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
import type { IGameStateStreamingService } from '../../services/interfaces/IGameStateStreamingService';

export const mockGameStateStreamingService: IGameStateStreamingService = {
  // Lifecycle
  start: vi.fn().mockResolvedValue(undefined),
  
  // Connection management
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  
  // State access
  requestState: vi.fn().mockResolvedValue(undefined),
  
  // Connection status
  getConnectionStatus: vi.fn().mockReturnValue({
    connected: false,
    state: 'IDLE',
    url: '',
    connectedAt: undefined,
    reconnectAttempts: 0,
    lastCombatStateTimestamp: undefined
  }),
  
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
  
};
