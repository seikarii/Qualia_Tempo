/**
 * QUALIA.CODE v1.1 - IEventTransformer<PlayerInputEvent, PlayerDirectionEvent> Mock
 * HIGH-FIDELITY MOCK: Contract-compliant mock for KeyToDirectionAdapter.
 * This is the single source of truth for this mock.
 */

import { vi } from 'vitest';
import type { IEventTransformer } from '../../services/protocol/IEventTransformer';
import type { PlayerInputEvent, PlayerDirectionEvent } from '../../services/contracts/events.contracts';

export const mockKeyAdapter: IEventTransformer<PlayerInputEvent, PlayerDirectionEvent> = {
  transform: vi.fn().mockReturnValue({
    type: 'PlayerDirection',
    direction: 'up',
    timestamp: new Date()
  })
};