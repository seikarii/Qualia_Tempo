/**
 * QUALIA.CODE v1.2 - Event Transformer Interface
 * Interface for transforming one event type into another within the domain.
 * Unlike IMessageAdapter which converts raw external data, this transforms
 * between typed events within the system.
 */

import { BaseEvent } from '../contracts/events.contracts';

/**
 * Event transformer interface for domain event transformations.
 * Use this when you need to convert one typed event into another,
 * not for adapting raw external data (use IMessageAdapter for that).
 */
export interface IEventTransformer<TInput extends BaseEvent, TOutput extends BaseEvent> {
  /**
   * Transform an input event into an output event.
   * @param inputEvent - Typed input event
   * @returns Transformed output event
   */
  transform(inputEvent: TInput): TOutput;
}
