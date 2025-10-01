/**
 * QUALIA.CODE v1.2 - Protocol Adapter Interface
 * Universal translator interface for converting raw external data to typed domain events.
 * Part of the Protocol Adapter Bundle for architectural purity.
 */

import { BaseEvent } from '../contracts/events.contracts';

/**
 * Raw data types that can be received from external sources
 */
export type RawMessageData = string | ArrayBuffer | Blob | Uint8Array | Record<string, unknown>;

/**
 * Universal message adapter interface.
 * Implementations convert raw data from external sources (WebSockets, HTTP, etc.)
 * into typed domain events for internal consumption.
 */
export interface IMessageAdapter {
  /**
   * Adapt raw data into a typed domain event.
   * @param rawData - Raw data from external source
   * @returns Typed domain event ready for EventBus emission
   */
  adapt(rawData: RawMessageData): BaseEvent;
}
