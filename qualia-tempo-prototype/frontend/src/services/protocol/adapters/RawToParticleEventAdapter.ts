/**
 * QUALIA.CODE v1.2 - Raw to Particle Event Adapter
 * Converts raw ArrayBuffer particle data from WebSocket to typed QualiaParticleDataReceivedEvent.
 * Part of the Protocol Adapter Bundle for architectural purity.
 */

import { injectable } from 'inversify';
import { IMessageAdapter } from '../IMessageAdapter';
import { QualiaParticleDataReceivedEvent } from '../../contracts/events.contracts';

@injectable()
export class RawToParticleEventAdapter implements IMessageAdapter {
  /**
   * Convert raw ArrayBuffer particle data to typed event.
   * Implements robust validation and proper event structure.
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

    // PROTOCOL TRANSLATION: Convert raw data to typed domain event
    return {
      type: "QualiaParticleDataReceived",
      particleData: rawData,
      source: "ProtocolAdapter:Raw",
      timestamp: new Date(), // Adapter generates timestamp for traceability
      metadata: {
        byteLength: rawData.byteLength,
        particleCount: rawData.byteLength / (21 * 4), // 21 floats * 4 bytes each
        protocolVersion: "binary_v1.2"
      }
    };
  }
}
