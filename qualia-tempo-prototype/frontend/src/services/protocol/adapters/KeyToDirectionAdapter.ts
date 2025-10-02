// QUALIA.CODE v1.2 - Event Transformer Implementation
import { injectable } from 'inversify';
import { IEventTransformer } from '../IEventTransformer';
import { PlayerInputEvent, PlayerDirectionEvent } from '../../contracts/events.contracts';

@injectable()
export class KeyToDirectionAdapter implements IEventTransformer<PlayerInputEvent, PlayerDirectionEvent> {
  public transform(rawEvent: PlayerInputEvent): PlayerDirectionEvent {
    const key = rawEvent.key.toLowerCase();
    let direction: 'north' | 'south' | 'east' | 'west' | null = null;

    // Usad un `switch` sobre la variable `key`.
    switch (key) {
      case 'w':
      case 'arrowup':
        direction = 'north';
        break;
      case 's':
      case 'arrowdown':
        direction = 'south';
        break;
      case 'd':
      case 'arrowright':
        direction = 'east';
        break;
      case 'a':
      case 'arrowleft':
        direction = 'west';
        break;
      default:
        direction = null;
        break;
    }

    if (!direction) {
      throw new Error(`Invalid key for direction: ${key}`);
    }

    return {
      type: "PlayerDirectionInput",
      direction,
      source: "ProtocolAdapter:KeyToDirection",
      timestamp: new Date(),
    };
  }
}