/**
 * QUALIA.CODE v1.2 - RawToParticleEventAdapter Unit Tests
 * Tests for RawToParticleEventAdapter to ensure proper data adaptation.
 * GOLD.CODE v1.0: Tests for binary protocol translation from optimized format.
 * 
 * ARCHITECTURAL COMPLIANCE: Uses IoC container for dependency injection as per QUALIA.CODE
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createTestContainer } from '../../../../testing/test-container-factory';
import type { Container } from 'inversify';
import { TYPES } from '../../../inversify.types';
import { RawToParticleEventAdapter } from '../RawToParticleEventAdapter';
import type { IMessageAdapter } from '../../IMessageAdapter';
import type { QualiaParticleDataReceivedEvent } from '../../../contracts/events.contracts';
import type { ProtocolAdapterConfig } from '../../../contracts/IProtocolAdapter.contracts';

describe('RawToParticleEventAdapter', () => {
  let container: Container;
  let adapter: IMessageAdapter;

  beforeEach(() => {
    // ARCHITECTURAL NOTE: Using test container for proper dependency injection
    container = createTestContainer();
    
    // ARCHITECTURAL NOTE: Bind ProtocolAdapterConfig as required dependency
    const testConfig: ProtocolAdapterConfig = {
      particleProtocol: {
        bytesPerParticle: 62,
        floatsPerGpuParticle: 21,
        version: "GOLD.CODE_v1.0",
        optimization: {
          originalBytesPerParticle: 84,
          optimizedBytesPerParticle: 62,
          memorySavingsPercent: 26.2
        },
        fieldOffsets: {
          position: 0,
          velocity: 12,
          acceleration: 24,
          forceAccumulator: 36,
          color: 48,
          lifetime: 52,
          size: 54,
          resonance: 56,
          mass: 58,
          charge: 60
        },
        gpuFieldOffsets: {
          position: 0,
          velocity: 3,
          acceleration: 6,
          color: 9,
          lifetime: 13,
          size: 14,
          resonance: 15,
          mass: 16,
          charge: 17,
          forceAccumulator: 18
        },
        colorNormalizationFactor: 255.0,
        validation: {
          minBufferSize: 0,
          requireMultipleOf: 62
        }
      },
      eventSource: "ProtocolAdapter:Raw"
    };
    
    container.bind<ProtocolAdapterConfig>(TYPES.ProtocolAdapterConfig)
      .toConstantValue(testConfig);
    
    // Replace mock adapter with real implementation
    container.unbind(TYPES.IRawToParticleEventAdapter);
    container.bind<IMessageAdapter>(TYPES.IRawToParticleEventAdapter)
      .to(RawToParticleEventAdapter)
      .inSingletonScope();
    
    adapter = container.get<IMessageAdapter>(TYPES.IRawToParticleEventAdapter);
  });

  describe('adapt', () => {
    it('should throw error for non-ArrayBuffer input', () => {
      expect(() => adapter.adapt('invalid' as any)).toThrow(
        'Invalid raw data format for RawToParticleEventAdapter. Expected ArrayBuffer, got string'
      );
    });

    it('should throw error for empty ArrayBuffer', () => {
      const emptyBuffer = new ArrayBuffer(0);
      expect(() => adapter.adapt(emptyBuffer)).toThrow(
        'Invalid particle data: ArrayBuffer is empty'
      );
    });

    it('should throw error for invalid buffer size (not multiple of 62)', () => {
      // Create ArrayBuffer with 60 bytes (not multiple of 62)
      const buffer = new ArrayBuffer(60);
      expect(() => adapter.adapt(buffer)).toThrow(
        'Invalid buffer size: 60. Must be a multiple of 62 bytes per particle (GOLD.CODE_v1.0 format).'
      );
    });

    it('should successfully adapt valid GOLD.CODE ArrayBuffer to Float32Array event', () => {
      // GOLD.CODE CONSTANTS
      const BYTES_PER_PARTICLE = 62;
      const buffer = new ArrayBuffer(BYTES_PER_PARTICLE);
      const view = new DataView(buffer);

      // Write test data in GOLD.CODE format (optimized 62 bytes)
      // Position (float32[3])
      view.setFloat32(0, 1.0, true);   // x
      view.setFloat32(4, 2.0, true);   // y
      view.setFloat32(8, 3.0, true);   // z

      // Velocity (float32[3])
      view.setFloat32(12, 0.1, true);  // x
      view.setFloat32(16, 0.2, true);  // y
      view.setFloat32(20, 0.3, true);  // z

      // Acceleration (float32[3])
      view.setFloat32(24, 0.01, true); // x
      view.setFloat32(28, 0.02, true); // y
      view.setFloat32(32, 0.03, true); // z

      // Force Accumulator (float32[3])
      view.setFloat32(36, 0.001, true); // x
      view.setFloat32(40, 0.002, true); // y
      view.setFloat32(44, 0.003, true); // z

      // Color (uint8[4]) - will be normalized to [0,1]
      view.setUint8(48, 128); // r -> 0.5
      view.setUint8(49, 64);  // g -> 0.25
      view.setUint8(50, 32);  // b -> 0.125
      view.setUint8(51, 255); // a -> 1.0

      // Lifetime (float16) - using a known float16 representation
      // 0x3C00 = 1.0 in float16 (sign=0, exp=15, mant=0)
      view.setUint16(52, 0x3C00, true); // 1.0

      // Size (float16) - 0x4000 = 2.0 in float16
      view.setUint16(54, 0x4000, true); // 2.0

      // Resonance (float16) - 0x4200 = 3.0 in float16
      view.setUint16(56, 0x4200, true); // 3.0

      // Mass (float16) - 0x4400 = 4.0 in float16
      view.setUint16(58, 0x4400, true); // 4.0

      // Charge (float16) - 0x4500 = 5.0 in float16
      view.setUint16(60, 0x4500, true); // 5.0

      const result = adapter.adapt(buffer) as QualiaParticleDataReceivedEvent;

      expect(result.type).toBe('QualiaParticleDataReceived');
      expect(result.particleData).toBeInstanceOf(Float32Array);
      expect(result.particleData.length).toBe(21);
      expect(result.source).toBe('ProtocolAdapter:Raw');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.metadata!.byteLength).toBe(62);
      expect(result.metadata!.particleCount).toBe(1);
      expect(result.metadata!.protocolVersion).toBe('GOLD.CODE_v1.0');
      expect(result.metadata!.optimization).toEqual({
        originalBytesPerParticle: 84,
        optimizedBytesPerParticle: 62,
        memorySavingsPercent: 26.2
      });

      // Verify decoded data integrity
      const data = result.particleData;
      expect(data[0]).toBe(1.0);   // position.x
      expect(data[1]).toBe(2.0);   // position.y
      expect(data[2]).toBe(3.0);   // position.z
      expect(data[3]).toBeCloseTo(0.1, 6);   // velocity.x
      expect(data[4]).toBeCloseTo(0.2, 6);   // velocity.y
      expect(data[5]).toBeCloseTo(0.3, 6);   // velocity.z
      expect(data[6]).toBeCloseTo(0.01, 6);  // acceleration.x
      expect(data[7]).toBeCloseTo(0.02, 6);  // acceleration.y
      expect(data[8]).toBeCloseTo(0.03, 6);  // acceleration.z
      expect(data[9]).toBeCloseTo(128/255, 6);    // color.r (128/255)
      expect(data[10]).toBeCloseTo(64/255, 6);   // color.g (64/255)
      expect(data[11]).toBeCloseTo(32/255, 6);  // color.b (32/255)
      expect(data[12]).toBe(1.0);  // color.a (255/255)
      expect(data[13]).toBe(1.0);  // lifetime
      expect(data[14]).toBe(2.0);  // size
      expect(data[15]).toBe(3.0);  // resonance
      expect(data[16]).toBe(4.0);  // mass
      expect(data[17]).toBe(5.0);  // charge
      expect(data[18]).toBeCloseTo(0.001, 6); // force_accumulator.x
      expect(data[19]).toBeCloseTo(0.002, 6); // force_accumulator.y
      expect(data[20]).toBeCloseTo(0.003, 6); // force_accumulator.z
    });

    it('should handle multiple particles correctly', () => {
      // Create ArrayBuffer with 124 bytes (2 particles * 62 bytes)
      const BYTES_PER_PARTICLE = 62;
      const buffer = new ArrayBuffer(2 * BYTES_PER_PARTICLE);
      const view = new DataView(buffer);

      // Write minimal test data for two particles
      for (let i = 0; i < 2; i++) {
        const offset = i * BYTES_PER_PARTICLE;
        // Position
        view.setFloat32(offset + 0, i + 1.0, true); // x
        view.setFloat32(offset + 4, i + 2.0, true); // y
        view.setFloat32(offset + 8, i + 3.0, true); // z
        // Fill other fields with zeros for simplicity
        // Velocity, acceleration, force (36 bytes of float32 = 0)
        // Color (4 bytes uint8 = 0)
        // Float16 fields (10 bytes = 0)
      }

      const result = adapter.adapt(buffer) as QualiaParticleDataReceivedEvent;

      expect(result.particleData.length).toBe(42); // 2 particles * 21 floats
      expect(result.metadata!.particleCount).toBe(2);
      expect(result.metadata!.byteLength).toBe(124);

      // Verify first particle
      expect(result.particleData[0]).toBe(1.0); // particle 0, position.x
      expect(result.particleData[1]).toBe(2.0); // particle 0, position.y
      expect(result.particleData[2]).toBe(3.0); // particle 0, position.z

      // Verify second particle (offset by 21 floats)
      expect(result.particleData[21]).toBe(2.0); // particle 1, position.x
      expect(result.particleData[22]).toBe(3.0); // particle 1, position.y
      expect(result.particleData[23]).toBe(4.0); // particle 1, position.z
    });
  });
});