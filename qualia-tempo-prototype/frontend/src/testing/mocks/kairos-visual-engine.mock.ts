/**
 * HIGH-FIDELITY MOCK: IKairosVisualEngine
 * COMPLIANCE: QUALIA.CODE v1.1 Section 10.3.1
 * 
 * CRITICAL RULE: NO bare vi.fn() for non-void return types.
 * ALL methods MUST have mockReturnValue/mockResolvedValue.
 */

import { vi } from 'vitest';
import type { IKairosVisualEngine, RenderStats } from '../../services/interfaces/IKairosVisualEngine';

const defaultRenderStats: RenderStats = {
  fps: 60,
  drawCalls: 0,
  triangles: 0,
  textureMemoryMB: 0,
};

export const mockKairosVisualEngine: IKairosVisualEngine = {
  // Lifecycle methods (async/void)
  initializeRenderer: vi.fn().mockResolvedValue(undefined), // Changed from initialize to initializeRenderer
  start: vi.fn().mockReturnValue(undefined),
  stop: vi.fn().mockReturnValue(undefined),
  updateConfig: vi.fn().mockResolvedValue(undefined),
  dispose: vi.fn().mockReturnValue(undefined),

  // Synchronous action methods (return void)
  updateScene: vi.fn().mockReturnValue(undefined),
  resize: vi.fn().mockReturnValue(undefined),
  setPostProcessingEffect: vi.fn().mockReturnValue(undefined),

  // Getters (MUST have mockReturnValue - HIGH FIDELITY)
  getRenderStats: vi.fn().mockReturnValue(defaultRenderStats),
};
