import { System } from '../ecs/System.js';
import { ECSManager } from '../ecs/ECSManager.js';
import { EventManager } from '../events/EventManager.js';
import { GameState } from '../ecs/components/GameState.js';
import { PlayerState } from '../ecs/components/PlayerState.js';
import { QualiaState } from '../ecs/components/QualiaState.js';
import { BossState } from '../ecs/components/BossState.js';
import { config } from '../config';

/**
 * The system responsible for saving and loading the game.
 */
export class SaveLoadSystem extends System {
  private lastSaveTime: number = 0;

  constructor(ecs: ECSManager, eventManager: EventManager) {
    super();
    this.ecs = ecs;
    this.eventManager = eventManager;

    // Load game state on initialization
    this.loadGame();
  }

  /**
   * Updates the save/load system.
   * @param deltaTime The time since the last update.
   * @param time The current time.
   */
  update(deltaTime: number, time: number): void {
    if (time - this.lastSaveTime > config.SAVE_LOAD_SYSTEM.SAVE_INTERVAL * 1000) {
      this.saveGame();
      this.lastSaveTime = time;
    }
  }

  /**
   * Saves the game.
   */
  private saveGame(): void {
    const gameStateEntity = this.ecs.getEntitiesByComponent(GameState)[0];
    const playerStateEntity = this.ecs.getEntitiesByComponent(PlayerState)[0];
    const qualiaStateEntity = this.ecs.getEntitiesByComponent(QualiaState)[0];
    const bossStateEntity = this.ecs.getEntitiesByComponent(BossState)[0];

    if (!gameStateEntity || !playerStateEntity || !qualiaStateEntity || !bossStateEntity) {
      console.warn('Cannot save game: missing essential state entities.');
      return;
    }

    const gameState = this.ecs.getComponent(gameStateEntity, GameState);
    const playerState = this.ecs.getComponent(playerStateEntity, PlayerState);
    const qualiaState = this.ecs.getComponent(qualiaStateEntity, QualiaState);
    const bossState = this.ecs.getComponent(bossStateEntity, BossState);

    if (!gameState || !playerState || !qualiaState || !bossState) {
      console.warn('Cannot save game: missing essential state components.');
      return;
    }

    const saveData = {
      gameState: { ...gameState },
      playerState: { ...playerState },
      qualiaState: { ...qualiaState },
      bossState: { ...bossState },
      // Add other relevant game state here
    };

    try {
      localStorage.setItem(config.SAVE_LOAD_SYSTEM.SAVE_KEY, JSON.stringify(saveData));
      console.log('Game saved successfully!');
    } catch (e) {
      console.error('Failed to save game:', e);
    }
  }

  /**
   * Loads the game.
   */
  private loadGame(): void {
    try {
      const savedData = localStorage.getItem(config.SAVE_LOAD_SYSTEM.SAVE_KEY);
      if (savedData) {
        const data = JSON.parse(savedData);

        const gameStateEntity = this.ecs.getEntitiesByComponent(GameState)[0];
        const playerStateEntity = this.ecs.getEntitiesByComponent(PlayerState)[0];
        const qualiaStateEntity = this.ecs.getEntitiesByComponent(QualiaState)[0];
        const bossStateEntity = this.ecs.getEntitiesByComponent(BossState)[0];

        if (!gameStateEntity || !playerStateEntity || !qualiaStateEntity || !bossStateEntity) {
            console.warn('Cannot load game: essential state entities not found. Starting new game.');
            return; // Or create new entities if this is initial load
        }

        Object.assign(this.ecs.getComponent(gameStateEntity, GameState), data.gameState);
        Object.assign(this.ecs.getComponent(playerStateEntity, PlayerState), data.playerState);
        Object.assign(this.ecs.getComponent(qualiaStateEntity, QualiaState), data.qualiaState);
        Object.assign(this.ecs.getComponent(bossStateEntity, BossState), data.bossState);

        console.log('Game loaded successfully!');
      } else {
        console.log('No saved game found. Starting new game.');
      }
    } catch (e) {
      console.error('Failed to load game:', e);
      console.log('Starting new game due to load error.');
    }
  }
}
