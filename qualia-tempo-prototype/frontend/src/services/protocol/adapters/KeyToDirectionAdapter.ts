// ESQUELETO - COMPLETAR
import { injectable } from 'inversify';
import { IMessageAdapter } from '../IMessageAdapter';
import { PlayerInputEvent, PlayerDirectionEvent } from '../../contracts/events.contracts';

@injectable()
export class KeyToDirectionAdapter implements IMessageAdapter {
  public adapt(rawEvent: PlayerInputEvent): PlayerDirectionEvent {
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