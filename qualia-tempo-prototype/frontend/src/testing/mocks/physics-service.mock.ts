/**
 * QUALIA.CODE v2.0 - High-Fidelity IPhysicsService Mock
 * Mock implementation for PhysicsService following high-fidelity standards.
 */

import { vi } from 'vitest';
import type { IPhysicsService, PhysicsData } from '../../services/interfaces/IPhysicsService';

export const mockPhysicsService: IPhysicsService = {
  initialize: vi.fn(),
  cleanup: vi.fn(),
  getCurrentPhysicsData: vi.fn().mockReturnValue({
    velocity: { x: 0, y: 0, z: 0 },
    acceleration: { x: 0, y: 0, z: 0 },
  } as PhysicsData),
  isRunning: vi.fn().mockReturnValue(false),
};
