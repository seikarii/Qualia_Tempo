/**
 * QUALIA.CODE v1.2 - Raw to Particle Event Adapter
 * Converts raw ArrayBuffer particle data from WebSocket to typed QualiaParticleDataReceivedEvent.
 * Part of the Protocol Adapter Bundle for architectural purity.
 * 
 * GOLD.CODE v1.0: Binary protocol translator for optimized particle data (62 bytes per particle).
 */

import { injectable } from 'inversify';
import { IMessageAdapter } from '../IMessageAdapter';
import { QualiaParticleDataReceivedEvent } from '../../contracts/events.contracts';

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
  /**
   * Convert raw ArrayBuffer particle data to typed event.
   * GOLD.CODE: Decodes optimized binary format (62 bytes per particle) to GPU-compatible Float32Array (84 bytes per particle).
   */
  public adapt(rawData: ArrayBuffer): QualiaParticleDataReceivedEvent {
    // VALIDATION: Ensure we have the expected ArrayBuffer format
    if (!(rawData instanceof ArrayBuffer)) {
      throw new Error(
        `Invalid raw data format for RawToParticleEventAdapter. Expected ArrayBuffer, got ${typeof rawData}`
      );
    }

    // VALIDATION: Ensure minimum data size for particle data
    if (rawData.byteLength === 0) {
      throw new Error(
        'Invalid particle data: ArrayBuffer is empty'
      );
    }

    // GOLD.CODE CONSTANTS
    const BYTES_PER_PARTICLE = 62;
    const FLOATS_PER_GPU_PARTICLE = 21;

    // VALIDATION: Ensure buffer size is multiple of optimized particle size
    if (rawData.byteLength % BYTES_PER_PARTICLE !== 0) {
      throw new Error(
        `Invalid buffer size: ${rawData.byteLength}. Must be a multiple of ${BYTES_PER_PARTICLE} bytes per particle (GOLD.CODE format).`
      );
    }

    const numParticles = rawData.byteLength / BYTES_PER_PARTICLE;
    const view = new DataView(rawData);

    // Buffer de destino para el formato que espera el motor de renderizado (GPU)
    const gpuBuffer = new Float32Array(numParticles * FLOATS_PER_GPU_PARTICLE);

    // PROTOCOL TRANSLATION: Decode each optimized particle and expand to GPU format
    for (let i = 0; i < numParticles; i++) {
      const byteOffset = i * BYTES_PER_PARTICLE;
      const floatOffset = i * FLOATS_PER_GPU_PARTICLE;

      // Position (offset 0-11, 12 bytes) -> float32[3]
      gpuBuffer[floatOffset + 0] = view.getFloat32(byteOffset + 0, true); // x
      gpuBuffer[floatOffset + 1] = view.getFloat32(byteOffset + 4, true); // y
      gpuBuffer[floatOffset + 2] = view.getFloat32(byteOffset + 8, true); // z

      // Velocity (offset 12-23, 12 bytes) -> float32[3]
      gpuBuffer[floatOffset + 3] = view.getFloat32(byteOffset + 12, true); // x
      gpuBuffer[floatOffset + 4] = view.getFloat32(byteOffset + 16, true); // y
      gpuBuffer[floatOffset + 5] = view.getFloat32(byteOffset + 20, true); // z

      // Acceleration (offset 24-35, 12 bytes) -> float32[3]
      gpuBuffer[floatOffset + 6] = view.getFloat32(byteOffset + 24, true); // x
      gpuBuffer[floatOffset + 7] = view.getFloat32(byteOffset + 28, true); // y
      gpuBuffer[floatOffset + 8] = view.getFloat32(byteOffset + 32, true); // z

      // Force Accumulator (offset 36-47, 12 bytes) -> float32[3]
      gpuBuffer[floatOffset + 9] = view.getFloat32(byteOffset + 36, true); // x
      gpuBuffer[floatOffset + 10] = view.getFloat32(byteOffset + 40, true); // y
      gpuBuffer[floatOffset + 11] = view.getFloat32(byteOffset + 44, true); // z

      // Color (offset 48-51, 4 bytes) -> uint8[4] normalized to float32[4]
      gpuBuffer[floatOffset + 12] = view.getUint8(byteOffset + 48) / 255.0; // r
      gpuBuffer[floatOffset + 13] = view.getUint8(byteOffset + 49) / 255.0; // g
      gpuBuffer[floatOffset + 14] = view.getUint8(byteOffset + 50) / 255.0; // b
      gpuBuffer[floatOffset + 15] = view.getUint8(byteOffset + 51) / 255.0; // a

      // Lifetime (offset 52-53, 2 bytes) -> float16 to float32
      gpuBuffer[floatOffset + 16] = decodeFloat16(view.getUint16(byteOffset + 52, true));

      // Size (offset 54-55, 2 bytes) -> float16 to float32
      gpuBuffer[floatOffset + 17] = decodeFloat16(view.getUint16(byteOffset + 54, true));

      // Resonance (offset 56-57, 2 bytes) -> float16 to float32
      gpuBuffer[floatOffset + 18] = decodeFloat16(view.getUint16(byteOffset + 56, true));

      // Mass (offset 58-59, 2 bytes) -> float16 to float32
      gpuBuffer[floatOffset + 19] = decodeFloat16(view.getUint16(byteOffset + 58, true));

      // Charge (offset 60-61, 2 bytes) -> float16 to float32
      gpuBuffer[floatOffset + 20] = decodeFloat16(view.getUint16(byteOffset + 60, true));
    }

    // PROTOCOL TRANSLATION: Convert decoded data to typed domain event
    return {
      type: "QualiaParticleDataReceived",
      particleData: gpuBuffer, // Expanded GPU-compatible buffer
      source: "ProtocolAdapter:Raw",
      timestamp: new Date(), // Adapter generates timestamp for traceability
      metadata: {
        byteLength: rawData.byteLength,
        particleCount: numParticles,
        protocolVersion: "GOLD.CODE_v1.0",
        optimization: {
          originalBytesPerParticle: 84,
          optimizedBytesPerParticle: 62,
          memorySavingsPercent: 26.2
        }
      }
    };
  }
}
