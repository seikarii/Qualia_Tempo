import { System } from '../ecs/System.js';
import { PlayerComponent, PositionComponent, type ComponentConstructor } from '../ecs/Component.js';
import { PlayerState } from '../ecs/components/PlayerState.js';
import { NoteComponent } from '../ecs/components/NoteComponent.js';
import { EventManager } from '../events/EventManager.js';
import { ECSManager } from '../ecs/ECSManager.js';
import type { Entity } from '../ecs/Entity.js';

const NOTE_HIT_RADIUS = 50; // Placeholder radius for hitting a note

export class PlayerInteractionSystem extends System {
    private eventManager: EventManager;

    constructor(
        ecs: ECSManager,
        eventManager: EventManager
    ) {
        super();
        this.ecs = ecs;
        this.eventManager = eventManager;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.eventManager.on('player_dash_success', this.handlePlayerDashSuccess.bind(this) as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.eventManager.on('player_dash_fail', this.handlePlayerDashFail.bind(this) as any);
    }

  public update(): void {
    // No continuous update needed for interaction, events drive it.
  }

  private handlePlayerDashSuccess(data: { cursorPosition: { x: number, y: number } }): void {
    const playerQuery = this.ecs.queryEntities(PlayerComponent, PositionComponent, PlayerState);
    const playerEntity: Entity | undefined = playerQuery[Symbol.iterator]().next().value;

    if (playerEntity === undefined) return;

    const playerPos = this.ecs.getComponent(playerEntity, PositionComponent as ComponentConstructor<PositionComponent>)!;
    const playerState = this.ecs.getComponent(playerEntity, PlayerState as ComponentConstructor<PlayerState>)!;

    if (playerState.dashCharges <= 0) {
        console.log("No dash charges left!");
        this.eventManager.emit('player_dash_fail', undefined); // Emit fail if no charges
        return;
    }

    playerState.dashCharges--; // Decrement dash charge on successful dash
    this.eventManager.emit('player_state_updated', { health: playerState.health, dashCharges: playerState.dashCharges });

    playerPos.x = data.cursorPosition.x; // Update player position immediately on dash
    playerPos.y = data.cursorPosition.y; // Update player position immediately on dash

    let hitNote: boolean = false;
    const notesQuery = this.ecs.queryEntities(NoteComponent, PositionComponent);
    for (const noteEntity of notesQuery) {
        const noteComponent = this.ecs.getComponent(noteEntity, NoteComponent as ComponentConstructor<NoteComponent>)!;
        const notePos = this.ecs.getComponent(noteEntity, PositionComponent as ComponentConstructor<PositionComponent>)!;

        if (noteComponent.hit) continue; // Skip already hit notes

        const dx: number = playerPos.x - notePos.x;
        const dy: number = playerPos.y - notePos.y;
        const distance: number = Math.sqrt(dx * dx + dy * dy);

        if (distance < NOTE_HIT_RADIUS) {
            noteComponent.hit = true; // Mark note as hit
            this.eventManager.emit('player_hit_note', { noteId: noteEntity });
            this.ecs.destroyEntity(noteEntity); // Destroy the note entity
            hitNote = true;
            break; // Assume only one note can be hit per dash for simplicity
        }
    }

    if (!hitNote) {
        // If a dash was successful rhythmically but didn't hit a note
        this.eventManager.emit('player_miss_note', undefined);
    }
  }

  private handlePlayerDashFail(): void {
    // A rhythmic dash failed, so it's a miss for note interaction as well
    this.eventManager.emit('player_miss_note', undefined);
  }
}