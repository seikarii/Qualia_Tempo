/**
 * QUALIA.CODE v1.1 - GameController Configuration Validator
 * Modular validation for GameController configuration section.
 */

import type { GameControllerConfig } from '../contracts/IGameControllerService.contracts';

/**
 * Validate GameController configuration section.
 * @param config - GameController configuration to validate
 * @throws Error if configuration is invalid
 */
export function validateGameControllerConfig(config: Partial<GameControllerConfig> | undefined): void {
  if (typeof config?.gameLifecycle?.autoStart !== 'boolean') {
    throw new Error('Invalid gameController.gameLifecycle.autoStart configuration: must be boolean');
  }
  
  if (typeof config?.performance?.updateIntervalMs !== 'number' || config.performance.updateIntervalMs <= 0) {
    throw new Error('Invalid gameController.performance.updateIntervalMs configuration: must be positive number');
  }
  
  if (typeof config?.health?.maxHealth !== 'number' || config.health.maxHealth <= 0) {
    throw new Error('Invalid gameController.health.maxHealth configuration: must be positive number');
  }
  
  if (typeof config?.scoring?.baseScorePerHit !== 'number' || config.scoring.baseScorePerHit <= 0) {
    throw new Error('Invalid gameController.scoring.baseScorePerHit configuration: must be positive number');
  }
  
  if (typeof config?.maxPlayers !== 'number' || config.maxPlayers <= 0) {
    throw new Error('Invalid gameController.maxPlayers configuration: must be positive number');
  }
}