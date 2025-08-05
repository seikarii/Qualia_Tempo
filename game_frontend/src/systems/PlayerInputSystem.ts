import { System } from '../ecs/System.js';
import { PositionComponent, PlayerComponent, AbilityComponent } from '../ecs/Component.js';
import { IEventManager } from '../events/EventManager.js';
import { GameEvent } from '../events/GameEvents.js';
import { ECSManager } from '../ecs/ECSManager.js';

export class PlayerInputSystem extends System {
  private keyMap: { [key: string]: boolean } = {};
  private isContinuePromptActive = false;

      constructor(
        ecs: ECSManager,
        eventManager: IEventManager
    ) {
        super();
        this.ecs = ecs;
        this.eventManager = eventManager;
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
    
    this.eventManager.on(GameEvent.ShowContinuePrompt, () => this.isContinuePromptActive = true);
    this.eventManager.on(GameEvent.SceneLoaded, () => this.isContinuePromptActive = false);
    this.eventManager.on('player_dash_success', this.handlePlayerDashSuccess.bind(this));
    this.eventManager.on('player_dash_fail', this.handlePlayerDashFail.bind(this));
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (this.isContinuePromptActive && event.key === 'Enter') {
        this.eventManager.emit(GameEvent.ContinueAfterBoss);
        this.isContinuePromptActive = false;
        return;
    }
    this.keyMap[event.key.toLowerCase()] = true;

    // Emit ability events on key down to avoid multiple emissions if key is held
    const playerEntity = this.ecs.getEntitiesByComponent(PlayerComponent)[0];
    if (playerEntity) {
        const abilityComponent = this.ecs.getComponent(playerEntity, AbilityComponent);
        if (abilityComponent) {
            for (const key in abilityComponent.keybinds) {
                if (event.key.toLowerCase() === abilityComponent.keybinds[key]) {
                    this.eventManager.emit(GameEvent.PLAYER_ABILITY_USED, { entityId: playerEntity, abilityId: key });
                }
            }
        }
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    delete this.keyMap[event.key.toLowerCase()];
  }

  update(): void {
    // WASD movement removed as per GDD
    // Player movement is now handled by rhythmic dash
  }

  private handlePlayerDashSuccess(data: { cursorPosition: { x: number, y: number } }): void {
    const playerEntity = this.ecs.getEntitiesByComponent(PlayerComponent)[0];
    if (playerEntity) {
      const playerPosition = this.ecs.getComponent(playerEntity, PositionComponent);
      if (playerPosition) {
        playerPosition.x = data.cursorPosition.x;
        playerPosition.y = data.cursorPosition.y;
        // console.log(`Player dashed to: (${playerPosition.x}, ${playerPosition.y})`);
      }
    }
  }

  private handlePlayerDashFail(): void {
    // console.log("Player dash failed rhythmically.");
    // Potentially emit event for visual/audio feedback for a failed dash
  }
}