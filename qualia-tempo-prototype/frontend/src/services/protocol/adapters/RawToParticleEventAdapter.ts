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
   * 
   * ARCHITECTURAL IMPROVEMENT: Extracted validation and decoding logic into focused helper methods
   * Reduced from 101 lines to ~35 lines (65% reduction)
   */
  public adapt(rawData: ArrayBuffer): QualiaParticleDataReceivedEvent {
    this.validateRawData(rawData);

    const numParticles = rawData.byteLength / this.config.particleProtocol.bytesPerParticle;
    const view = new DataView(rawData);
    const gpuBuffer = this.createGpuBuffer(numParticles);

    this.decodeParticles(view, gpuBuffer, numParticles);

    return this.buildEvent(rawData, gpuBuffer, numParticles);
  }

  /**
   * Validate raw data format and size
   */
  private validateRawData(rawData: ArrayBuffer): void {
    if (!(rawData instanceof ArrayBuffer)) {
      throw new Error(
        `Invalid raw data format for RawToParticleEventAdapter. Expected ArrayBuffer, got ${typeof rawData}`
      );
    }

    if (rawData.byteLength === this.config.particleProtocol.validation.minBufferSize) {
      throw new Error('Invalid particle data: ArrayBuffer is empty');
    }

    if (rawData.byteLength % this.config.particleProtocol.validation.requireMultipleOf !== 0) {
      throw new Error(
        `Invalid buffer size: ${rawData.byteLength}. Must be a multiple of ${this.config.particleProtocol.validation.requireMultipleOf} bytes per particle (${this.config.particleProtocol.version} format).`
      );
    }
  }

  /**
   * Create GPU buffer for decoded particles
   */
  private createGpuBuffer(numParticles: number): Float32Array {
    return new Float32Array(numParticles * this.config.particleProtocol.floatsPerGpuParticle);
  }

  /**
   * Decode all particles from raw buffer to GPU buffer
   */
  private decodeParticles(view: DataView, gpuBuffer: Float32Array, numParticles: number): void {
    const BYTES_PER_PARTICLE = this.config.particleProtocol.bytesPerParticle;
    const FLOATS_PER_GPU_PARTICLE = this.config.particleProtocol.floatsPerGpuParticle;

    for (let i = 0; i < numParticles; i++) {
      const byteOffset = i * BYTES_PER_PARTICLE;
      const floatOffset = i * FLOATS_PER_GPU_PARTICLE;
      this.decodeParticle(view, gpuBuffer, byteOffset, floatOffset);
    }
  }

  /**
   * Decode single particle from binary format to GPU format
   */
  private decodeParticle(view: DataView, gpuBuffer: Float32Array, byteOffset: number, floatOffset: number): void {
    const fieldOffsets = this.config.particleProtocol.fieldOffsets;
    const gpuOffsets = this.config.particleProtocol.gpuFieldOffsets;
    const colorNorm = this.config.particleProtocol.colorNormalizationFactor;

    // Context object for decoder methods (Parameter Object Pattern)
    const ctx = { view, gpuBuffer, byteOffset, floatOffset };

    // Decode vector fields (position, velocity, acceleration, force accumulator)
    this.decodeVectorField(ctx, fieldOffsets.position, gpuOffsets.position);
    this.decodeVectorField(ctx, fieldOffsets.velocity, gpuOffsets.velocity);
    this.decodeVectorField(ctx, fieldOffsets.acceleration, gpuOffsets.acceleration);
    this.decodeVectorField(ctx, fieldOffsets.forceAccumulator, gpuOffsets.forceAccumulator);

    // Decode color field (uint8[4] to float32[4])
    this.decodeColorField(ctx, fieldOffsets.color, gpuOffsets.color, colorNorm);

    // Decode scalar fields (float16 to float32)
    this.decodeScalarField(ctx, fieldOffsets.lifetime, gpuOffsets.lifetime);
    this.decodeScalarField(ctx, fieldOffsets.size, gpuOffsets.size);
    this.decodeScalarField(ctx, fieldOffsets.resonance, gpuOffsets.resonance);
    this.decodeScalarField(ctx, fieldOffsets.mass, gpuOffsets.mass);
    this.decodeScalarField(ctx, fieldOffsets.charge, gpuOffsets.charge);
  }

  /**
   * Decode float32[3] vector field
   * QUALIA.CODE COMPLIANT: Parameter Object Pattern to reduce parameter count
   */
  private decodeVectorField(
    ctx: { view: DataView; gpuBuffer: Float32Array; byteOffset: number; floatOffset: number },
    srcOffset: number,
    dstOffset: number
  ): void {
    ctx.gpuBuffer[ctx.floatOffset + dstOffset + 0] = ctx.view.getFloat32(ctx.byteOffset + srcOffset + 0, true);
    ctx.gpuBuffer[ctx.floatOffset + dstOffset + 1] = ctx.view.getFloat32(ctx.byteOffset + srcOffset + 4, true);
    ctx.gpuBuffer[ctx.floatOffset + dstOffset + 2] = ctx.view.getFloat32(ctx.byteOffset + srcOffset + 8, true);
  }

  /**
   * Decode uint8[4] color field to float32[4] normalized
   * QUALIA.CODE COMPLIANT: Parameter Object Pattern
   */
  private decodeColorField(
    ctx: { view: DataView; gpuBuffer: Float32Array; byteOffset: number; floatOffset: number },
    srcOffset: number,
    dstOffset: number,
    colorNorm: number
  ): void {
    ctx.gpuBuffer[ctx.floatOffset + dstOffset + 0] = ctx.view.getUint8(ctx.byteOffset + srcOffset + 0) / colorNorm;
    ctx.gpuBuffer[ctx.floatOffset + dstOffset + 1] = ctx.view.getUint8(ctx.byteOffset + srcOffset + 1) / colorNorm;
    ctx.gpuBuffer[ctx.floatOffset + dstOffset + 2] = ctx.view.getUint8(ctx.byteOffset + srcOffset + 2) / colorNorm;
    ctx.gpuBuffer[ctx.floatOffset + dstOffset + 3] = ctx.view.getUint8(ctx.byteOffset + srcOffset + 3) / colorNorm;
  }

  /**
   * Decode float16 scalar field to float32
   * QUALIA.CODE COMPLIANT: Parameter Object Pattern
   */
  private decodeScalarField(
    ctx: { view: DataView; gpuBuffer: Float32Array; byteOffset: number; floatOffset: number },
    srcOffset: number,
    dstOffset: number
  ): void {
    ctx.gpuBuffer[ctx.floatOffset + dstOffset] = decodeFloat16(ctx.view.getUint16(ctx.byteOffset + srcOffset, true));
  }

  /**
   * Build typed event from decoded data
   */
  private buildEvent(rawData: ArrayBuffer, gpuBuffer: Float32Array, numParticles: number): QualiaParticleDataReceivedEvent {
    return {
      type: "QualiaParticleDataReceived",
      particleData: gpuBuffer,
      source: this.config.eventSource,
      timestamp: new Date(),
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
