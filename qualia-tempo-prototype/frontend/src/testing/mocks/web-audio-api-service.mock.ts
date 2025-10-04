/**
 * GOLD.CODE - High-Fidelity Mock for IWebAudioAPIService
 * Provides a contract-compliant mock with realistic AudioContext behavior.
 */

import { vi } from 'vitest';
import type { IWebAudioAPIService } from '../../services/interfaces/IWebAudioAPIService';

/**
 * High-Fidelity Mock AnalyserNode
 * Simulates the Web Audio API AnalyserNode with testable data injection
 */
export const createMockAnalyserNode = () => {
  const mockFrequencyData = new Uint8Array(2048).fill(0);
  
  return {
    fftSize: 2048,
    frequencyBinCount: 1024,
    smoothingTimeConstant: 0.8,
    minDecibels: -100,
    maxDecibels: -30,
    connect: vi.fn(),
    disconnect: vi.fn(),
    getByteFrequencyData: vi.fn((array: Uint8Array) => {
      // Fill the array with mock frequency data
      // For testing, we'll simulate some non-zero frequency content
      for (let i = 0; i < array.length; i++) {
        array[i] = mockFrequencyData[i];
      }
    }),
    getByteTimeDomainData: vi.fn(),
    getFloatFrequencyData: vi.fn(),
    getFloatTimeDomainData: vi.fn(),
    // Helper method to inject test data
    _setMockFrequencyData: (data: Uint8Array) => {
      mockFrequencyData.set(data);
    },
  };
};

/**
 * High-Fidelity Mock AudioContext
 * Simulates the Web Audio API AudioContext with testable behavior
 */
export const createMockAudioContext = () => {
  const mockAnalyserNode = createMockAnalyserNode();
  const mockOscillator = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    frequency: { value: 440 },
    type: 'sine' as OscillatorType,
  };
  
  return {
    state: 'running' as AudioContextState,
    sampleRate: 48000,
    currentTime: 0,
    destination: { connect: vi.fn(), disconnect: vi.fn() },
    createAnalyser: vi.fn(() => mockAnalyserNode),
    createOscillator: vi.fn(() => mockOscillator),
    createGain: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      gain: { value: 1 },
    })),
    resume: vi.fn().mockResolvedValue(undefined),
    suspend: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    // Expose mock nodes for test assertions
    _mockAnalyserNode: mockAnalyserNode,
    _mockOscillator: mockOscillator,
  };
};

/**
 * High-Fidelity Mock IWebAudioAPIService
 * GOLD.CODE STANDARD: Respects interface contract, provides predictable defaults
 */
export const mockWebAudioAPIService: IWebAudioAPIService = {
  getAudioContext: vi.fn(() => createMockAudioContext() as unknown as AudioContext),
  playTone: vi.fn(), // Overloaded method - vi.fn() handles both signatures
  startContext: vi.fn().mockResolvedValue(undefined),
};

/**
 * Helper to create a fresh mock with injected test data
 */
export const createMockWebAudioAPIServiceWithData = (frequencyData?: Uint8Array) => {
  const mockAudioContext = createMockAudioContext();
  
  if (frequencyData) {
    (mockAudioContext._mockAnalyserNode as any)._setMockFrequencyData(frequencyData);
  }
  
  return {
    getAudioContext: vi.fn(() => mockAudioContext as unknown as AudioContext),
    playTone: vi.fn(),
    startContext: vi.fn().mockResolvedValue(undefined),
    _mockAudioContext: mockAudioContext, // Expose for test assertions
  };
};
