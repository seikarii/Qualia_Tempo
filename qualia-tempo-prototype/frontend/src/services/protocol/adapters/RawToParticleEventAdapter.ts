/**
 * QUALIA.CODE v1.2 - Raw to Particle Event Adapter
 * Converts raw ArrayBuffer particle data from WebSocket to typed QualiaParticleDataReceivedEvent.
 * Part of the Protocol Adapter Bundle for architectural purity.
 * 
 * GOLD.CODE v1.0: Binary protocol translator for optimized particle data (62 bytes per particle).
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '../../inversify.types';
import { IMessageAdapter } from '../IMessageAdapter';
import { QualiaParticleDataReceivedEvent } from '../../contracts/events.contracts';
import type { ProtocolAdapterConfig } from '../../contracts/IProtocolAdapter.contracts';

/**
 * Decode IEEE 754 half-precision (16-bit) float to JavaScript number.
 * Implementation based on standard Float16 conversion algorithm.
 */
function decodeFloat16(binary: number): number {
  const sign = (binary & 0x8000) >> 15;
  const exponent = (binary & 0x7C00) >> 10;
  const fraction = binary & 0x03FF;

  if (exponent === 0) {
    return (sign ? -1 : 1) * Math.pow(2, -14) * (fraction / 1024);
  } else if (exponent === 31) {
    return fraction === 0 ? (sign ? -Infinity : Infinity) : NaN;
  } else {
    return (sign ? -1 : 1) * Math.pow(2, exponent - 15) * (1 + fraction / 1024);
  }
}

@injectable()
export class RawToParticleEventAdapter implements IMessageAdapter {
  private readonly config: ProtocolAdapterConfig;

  constructor(@inject(TYPES.ProtocolAdapterConfig) config: ProtocolAdapterConfig) {
    this.config = config;
  }

  /**
   * Convert raw ArrayBuffer particle data to typed event.
   * GOLD.CODE: Decodes optimized binary format to GPU-compatible Float32Array.
   */
  public adapt(rawData: ArrayBuffer): QualiaParticleDataReceivedEvent {
    // VALIDATION: Ensure we have the expected ArrayBuffer format
    if (!(rawData instanceof ArrayBuffer)) {
      throw new Error(
        `Invalid raw data format for RawToParticleEventAdapter. Expected ArrayBuffer, got ${typeof rawData}`
      );
    }

    // VALIDATION: Ensure minimum data size for particle data
    if (rawData.byteLength === this.config.particleProtocol.validation.minBufferSize) {
      throw new Error(
        'Invalid particle data: ArrayBuffer is empty'
      );
    }

    // GOLD.CODE CONSTANTS from configuration
    const BYTES_PER_PARTICLE = this.config.particleProtocol.bytesPerParticle;
    const FLOATS_PER_GPU_PARTICLE = this.config.particleProtocol.floatsPerGpuParticle;

    // VALIDATION: Ensure buffer size is multiple of optimized particle size
    if (rawData.byteLength % this.config.particleProtocol.validation.requireMultipleOf !== 0) {
      throw new Error(
        `Invalid buffer size: ${rawData.byteLength}. Must be a multiple of ${this.config.particleProtocol.validation.requireMultipleOf} bytes per particle (${this.config.particleProtocol.version} format).`
      );
    }

    const numParticles = rawData.byteLength / BYTES_PER_PARTICLE;
    const view = new DataView(rawData);

    // Buffer de destino para el formato que espera el motor de renderizado (GPU)
    const gpuBuffer = new Float32Array(numParticles * FLOATS_PER_GPU_PARTICLE);

    // PROTOCOL TRANSLATION: Decode each optimized particle and expand to GPU format
    const fieldOffsets = this.config.particleProtocol.fieldOffsets;
    const gpuOffsets = this.config.particleProtocol.gpuFieldOffsets;
    const colorNorm = this.config.particleProtocol.colorNormalizationFactor;

    for (let i = 0; i < numParticles; i++) {
      const byteOffset = i * BYTES_PER_PARTICLE;
      const floatOffset = i * FLOATS_PER_GPU_PARTICLE;

      // Position -> float32[3]
      gpuBuffer[floatOffset + gpuOffsets.position + 0] = view.getFloat32(byteOffset + fieldOffsets.position + 0, true);
      gpuBuffer[floatOffset + gpuOffsets.position + 1] = view.getFloat32(byteOffset + fieldOffsets.position + 4, true);
      gpuBuffer[floatOffset + gpuOffsets.position + 2] = view.getFloat32(byteOffset + fieldOffsets.position + 8, true);

      // Velocity -> float32[3]
      gpuBuffer[floatOffset + gpuOffsets.velocity + 0] = view.getFloat32(byteOffset + fieldOffsets.velocity + 0, true);
      gpuBuffer[floatOffset + gpuOffsets.velocity + 1] = view.getFloat32(byteOffset + fieldOffsets.velocity + 4, true);
      gpuBuffer[floatOffset + gpuOffsets.velocity + 2] = view.getFloat32(byteOffset + fieldOffsets.velocity + 8, true);

      // Acceleration -> float32[3]
      gpuBuffer[floatOffset + gpuOffsets.acceleration + 0] = view.getFloat32(byteOffset + fieldOffsets.acceleration + 0, true);
      gpuBuffer[floatOffset + gpuOffsets.acceleration + 1] = view.getFloat32(byteOffset + fieldOffsets.acceleration + 4, true);
      gpuBuffer[floatOffset + gpuOffsets.acceleration + 2] = view.getFloat32(byteOffset + fieldOffsets.acceleration + 8, true);

      // Color -> uint8[4] normalized to float32[4]
      gpuBuffer[floatOffset + gpuOffsets.color + 0] = view.getUint8(byteOffset + fieldOffsets.color + 0) / colorNorm;
      gpuBuffer[floatOffset + gpuOffsets.color + 1] = view.getUint8(byteOffset + fieldOffsets.color + 1) / colorNorm;
      gpuBuffer[floatOffset + gpuOffsets.color + 2] = view.getUint8(byteOffset + fieldOffsets.color + 2) / colorNorm;
      gpuBuffer[floatOffset + gpuOffsets.color + 3] = view.getUint8(byteOffset + fieldOffsets.color + 3) / colorNorm;

      // Lifetime -> float16 to float32
      gpuBuffer[floatOffset + gpuOffsets.lifetime] = decodeFloat16(view.getUint16(byteOffset + fieldOffsets.lifetime, true));

      // Size -> float16 to float32
      gpuBuffer[floatOffset + gpuOffsets.size] = decodeFloat16(view.getUint16(byteOffset + fieldOffsets.size, true));

      // Resonance -> float16 to float32
      gpuBuffer[floatOffset + gpuOffsets.resonance] = decodeFloat16(view.getUint16(byteOffset + fieldOffsets.resonance, true));

      // Mass -> float16 to float32
      gpuBuffer[floatOffset + gpuOffsets.mass] = decodeFloat16(view.getUint16(byteOffset + fieldOffsets.mass, true));

      // Charge -> float16 to float32
      gpuBuffer[floatOffset + gpuOffsets.charge] = decodeFloat16(view.getUint16(byteOffset + fieldOffsets.charge, true));

      // Force Accumulator -> float32[3]
      gpuBuffer[floatOffset + gpuOffsets.forceAccumulator + 0] = view.getFloat32(byteOffset + fieldOffsets.forceAccumulator + 0, true);
      gpuBuffer[floatOffset + gpuOffsets.forceAccumulator + 1] = view.getFloat32(byteOffset + fieldOffsets.forceAccumulator + 4, true);
      gpuBuffer[floatOffset + gpuOffsets.forceAccumulator + 2] = view.getFloat32(byteOffset + fieldOffsets.forceAccumulator + 8, true);
    }

    // PROTOCOL TRANSLATION: Convert decoded data to typed domain event
    return {
      type: "QualiaParticleDataReceived",
      particleData: gpuBuffer, // Expanded GPU-compatible buffer
      source: this.config.eventSource,
      timestamp: new Date(), // Adapter generates timestamp for traceability
      metadata: {
        byteLength: rawData.byteLength,
        particleCount: numParticles,
        protocolVersion: this.config.particleProtocol.version,
        optimization: {
          originalBytesPerParticle: this.config.particleProtocol.optimization.originalBytesPerParticle,
          optimizedBytesPerParticle: this.config.particleProtocol.optimization.optimizedBytesPerParticle,
          memorySavingsPercent: this.config.particleProtocol.optimization.memorySavingsPercent
        }
      }
    };
  }
}
