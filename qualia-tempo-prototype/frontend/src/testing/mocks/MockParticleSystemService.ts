/**
 * QUALIA.CODE v1.1 - High-Fidelity Mock for IParticleSystemService
 * TYPE: Test Double (Mock)
 * 
 * PURPOSE: Provide type-safe, high-fidelity mock for testing
 * ARCHITECTURE: All methods return safe defaults, no vi.fn() bare returns
 * 
 * CRITICAL: High-fidelity mocks prevent undefined returns that cause test failures
 * REFERENCE: QUALIA.MANUAL.md Section 10.3.1 - High-Fidelity Mocking
 */

import { vi } from 'vitest';
import type { IParticleSystemService } from '../../services/interfaces/IParticleSystemService';
import type * as THREE from 'three';

/**
 * Create high-fidelity mock for IParticleSystemService
 * All methods have safe default implementations
 */
export function createMockParticleSystemService(): IParticleSystemService {
  return {
    // IBaseService lifecycle methods
    initialize: vi.fn<() => void>().mockImplementation(() => {
      // No-op: initialization simulated
    }),
    
    cleanup: vi.fn<() => void>().mockImplementation(() => {
      // No-op: cleanup simulated
    }),
    
    // IParticleSystemService methods
    getInstancedMesh: vi.fn<() => THREE.InstancedMesh | null>().mockReturnValue(null),
    
    update: vi.fn<(deltaTime: number) => void>().mockImplementation(() => {
      // No-op: update simulated
    }),
    
    dispose: vi.fn<() => void>().mockImplementation(() => {
      // No-op: disposal simulated
    }),
  };
}
