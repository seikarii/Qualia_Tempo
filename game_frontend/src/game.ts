import { ECSManager } from './ecs/ECSManager';
import { EventManager } from './events/EventManager';
import { QualiaSystem } from './systems/QualiaSystem';
import { MusicSystem } from './systems/MusicSystem';
import { FloorSystem } from './systems/FloorSystem';
import { PlayerInputSystem } from './systems/PlayerInputSystem';
import { RenderSystem } from './systems/RenderSystem';
import { PlayerInteractionSystem } from './systems/PlayerInteractionSystem';
import { CombatManager } from './data/CombatManager';
import { QualiaState } from './ecs/components/QualiaState';
import { BossState } from './ecs/components/BossState';
import { PlayerState } from './ecs/components/PlayerState';
import { GameState } from './ecs/components/GameState';
import { PositionComponent } from './ecs/Component'; // Import PositionComponent

let animationFrameId: number | null = null;

export function stopGame() {
    if (typeof window === 'undefined') return;
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

export const ecsManager: ECSManager = typeof window !== 'undefined' ? new ECSManager() : {} as ECSManager;
export const eventManager: EventManager = typeof window !== 'undefined' ? new EventManager() : new EventManager();

export interface GameAPI {
    ecsManager: ECSManager;
    eventManager: EventManager;
}

export async function startGame(canvas: HTMLCanvasElement) {
    if (typeof window === 'undefined') {
        console.log('startGame called in a non-browser environment. Aborting.');
        return;
    }

    // --- Instanciación ---
    const combatManager = new CombatManager();

    // Systems
    const musicSystem = new MusicSystem(eventManager, combatManager);
    const qualiaSystem = new QualiaSystem(eventManager);
    const floorSystem = new FloorSystem(ecsManager, eventManager, combatManager);
    const playerInputSystem = new PlayerInputSystem(ecsManager, eventManager);
    const renderSystem = new RenderSystem(ecsManager, canvas); // Assuming RenderSystem needs canvas
    const playerInteractionSystem = new PlayerInteractionSystem(ecsManager, eventManager);

    // Add systems to ECS
    ecsManager.addSystem(musicSystem);
    ecsManager.addSystem(qualiaSystem);
    ecsManager.addSystem(floorSystem);
    ecsManager.addSystem(playerInputSystem);
    ecsManager.addSystem(renderSystem);
    ecsManager.addSystem(playerInteractionSystem);

    // Create initial entities
    const qualiaEntity = ecsManager.createEntity();
    ecsManager.addComponent(qualiaEntity, QualiaState);

    const bossEntity = ecsManager.createEntity();
    ecsManager.addComponent(bossEntity, BossState);

    const playerEntity = ecsManager.createEntity();
    ecsManager.addComponent(playerEntity, PlayerState);
    ecsManager.addComponent(playerEntity, new PositionComponent(canvas.width / 2, canvas.height / 2)); // Add PositionComponent

    const gameEntity = ecsManager.createEntity();
    ecsManager.addComponent(gameEntity, GameState);

    // --- Bucle de Juego ---
    let lastTime = 0;
    const gameLoop = (time: number) => {
        if (!gameInitialized) {
            gameInitialized = true;
            lastTime = time;
        }
        const deltaTime = (time - lastTime) / 1000;
        lastTime = time;

        ecsManager.update(deltaTime, time);
        renderSystem.render(deltaTime, time); // Call render system

        animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    // Load initial combat data (example)
    await combatManager.loadCombatData('/Boss1.json'); // Assuming Boss1.json exists in public
    musicSystem.loadAndPlayTrack('Boss1'); // Assuming 'Boss1' is the ID in Boss1.json
}

let gameInitialized = false;
