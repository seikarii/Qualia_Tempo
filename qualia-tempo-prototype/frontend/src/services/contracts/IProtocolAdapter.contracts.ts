/**
 * QUALIA.CODE v1.1 - Protocol Adapter Configuration Contracts
 * Type definitions for binary protocol translation configuration
 */

export interface ProtocolAdapterConfig {
  particleProtocol: ParticleProtocolConfig;
  eventSource: string;
}

export interface ParticleProtocolConfig {
  bytesPerParticle: number;
  floatsPerGpuParticle: number;
  version: string;
  optimization: ProtocolOptimizationMetrics;
  fieldOffsets: BinaryFieldOffsets;
  gpuFieldOffsets: GpuFieldOffsets;
  colorNormalizationFactor: number;
  validation: ProtocolValidationConfig;
}

export interface ProtocolOptimizationMetrics {
  originalBytesPerParticle: number;
  optimizedBytesPerParticle: number;
  memorySavingsPercent: number;
}

export interface BinaryFieldOffsets {
  position: number;
  velocity: number;
  acceleration: number;
  forceAccumulator: number;
  color: number;
  lifetime: number;
  size: number;
  resonance: number;
  mass: number;
  charge: number;
}

export interface GpuFieldOffsets {
  position: number;
  velocity: number;
  acceleration: number;
  color: number;
  lifetime: number;
  size: number;
  resonance: number;
  mass: number;
  charge: number;
  forceAccumulator: number;
}

export interface ProtocolValidationConfig {
  minBufferSize: number;
  requireMultipleOf: number;
}
