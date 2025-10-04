import { vi } from 'vitest';
import { IGameStateStoreService } from '../../services/interfaces/IGameStateStoreService';

/**
 * High-Fidelity Mock for IGameStateStoreService
 * CRISALIDA.CODE Phase 2: Removed getGameState() - service now uses event-driven state tracking
 */
export const mockGameStateStoreService: IGameStateStoreService = {
  initialize: vi.fn().mockResolvedValue(undefined),
  cleanup: vi.fn().mockResolvedValue(undefined),
  updateGameState: vi.fn().mockResolvedValue(undefined),
  updateQualiaState: vi.fn().mockResolvedValue(undefined),
  getStatus: vi.fn().mockReturnValue('stopped'),
  isRunning: vi.fn().mockReturnValue(false),
  setStoreSetter: vi.fn().mockResolvedValue(undefined),
};