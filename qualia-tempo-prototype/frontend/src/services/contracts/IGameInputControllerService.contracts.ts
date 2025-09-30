/**
 * QUALIA.CODE v1.1 - GameInputControllerService Contracts
 * Centralized type definitions for game input controller system
 *
 * Purpose: Single source of truth for all game input controller data structures
 * Architecture: Contract definitions extracted from service implementation for clarity and reusability
 */

export interface GameInputControllerConfig {
  timingWindows: {
    perfect: number;
    good: number;
  };
}