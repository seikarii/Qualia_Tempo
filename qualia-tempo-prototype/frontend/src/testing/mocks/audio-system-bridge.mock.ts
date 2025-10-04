/**
 * QUALIA.CODE v1.1 - High-Fidelity Mock for IAudioSystemBridge
 * Mock implementation following the High-Fidelity Mocking Standard.
 *
 * ARCHITECTURAL COMPLIANCE:
 * ✅ High-Fidelity: All methods return type-safe defaults
 * ✅ Predictable: No undefined returns
 * ✅ Contract-compliant: Respects IAudioSystemBridge interface
 * ✅ Testable: Enables assertion of method calls
 *
 * USAGE:
 * Import this mock in test files that need IAudioSystemBridge mocking.
 * The mock is pre-configured with sensible defaults but can be
 * reconfigured per test using Vitest's mockResolvedValue/mockRejectedValue.
 */

import { vi } from 'vitest';
import type { IAudioSystemBridge } from '../../services/interfaces/IAudioSystemBridge';

/**
 * High-Fidelity mock for IAudioSystemBridge
 *
 * DEFAULT BEHAVIOR:
 * - initializeAudioSession(): Resolves successfully (Promise<void>)
 *
 * RECONFIGURATION EXAMPLE:
 * ```typescript
 * mockAudioSystemBridge.initializeAudioSession.mockRejectedValue(
 *   new Error('IPC not available')
 * );
 * ```
 */
export const mockAudioSystemBridge: IAudioSystemBridge = {
  /**
   * Mock implementation of initializeAudioSession
   *
   * DEFAULT: Resolves successfully (simulates successful audio session init)
   * RECONFIGURABLE: Use .mockResolvedValue() or .mockRejectedValue()
   */
  initializeAudioSession: vi.fn().mockResolvedValue(undefined),
};

/**
 * Factory function to create a fresh mock instance
 *
 * USE CASE: Tests that need isolated mock instances to prevent
 * state leakage between tests.
 *
 * @returns Fresh IAudioSystemBridge mock
 *
 * @example
 * ```typescript
 * const freshMock = createMockAudioSystemBridge();
 * freshMock.initializeAudioSession.mockRejectedValue(new Error('Test error'));
 * ```
 */
export function createMockAudioSystemBridge(): IAudioSystemBridge {
  return {
    initializeAudioSession: vi.fn().mockResolvedValue(undefined),
  };
}
