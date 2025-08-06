import { getComponentForEntity } from '../utils/ecsUtils';

// ... (resto del código)

  private saveGame(): void {
    const gameState = getComponentForEntity(this.ecs, GameState);
    const playerState = getComponentForEntity(this.ecs, PlayerState);
    const qualiaState = getComponentForEntity(this.ecs, QualiaState);
    const bossState = getComponentForEntity(this.ecs, BossState);

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

        const gameState = getComponentForEntity(this.ecs, GameState);
        const playerState = getComponentForEntity(this.ecs, PlayerState);
        const qualiaState = getComponentForEntity(this.ecs, QualiaState);
        const bossState = getComponentForEntity(this.ecs, BossState);

        if (!gameState || !playerState || !qualiaState || !bossState) {
            console.warn('Cannot load game: essential state entities not found. Starting new game.');
            return; // Or create new entities if this is initial load
        }

        if (gameState) Object.assign(gameState, data.gameState);
        if (playerState) Object.assign(playerState, data.playerState);
        if (qualiaState) Object.assign(qualiaState, data.qualiaState);
        if (bossState) Object.assign(bossState, data.bossState);

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
