import { System } from '../ecs/System.js';
import {
  PlayerComponent,
  PositionComponent,
} from '../ecs/Component.js';
import { NoteComponent } from '../ecs/components/NoteComponent.js';
import { EventManager } from '../events/EventManager.js';
import { ECSManager } from '../ecs/ECSManager.js';

const NOTE_HIT_RADIUS = 50; // Placeholder radius for hitting a note

export class PlayerInteractionSystem extends System {
    constructor(
        ecs: ECSManager,
        eventManager: EventManager
    ) {
        super();
        this.ecs = ecs;
        this.eventManager = eventManager;
        this.eventManager.on('player_dash_success', this.handlePlayerDashSuccess.bind(this));
        this.eventManager.on('player_dash_fail', this.handlePlayerDashFail.bind(this));
    }

  public update(): void {
    // No continuous update needed for interaction, events drive it.
  }

  private handlePlayerDashSuccess(data: { cursorPosition: { x: number, y: number } }): void {
    const playerQuery = this.ecs.queryEntities(PlayerComponent, PositionComponent);
    const playerEntity = playerQuery.next().value;

    if (playerEntity === undefined) return;

    const playerPos = this.ecs.getComponent(playerEntity, PositionComponent)!;
    playerPos.x = data.cursorPosition.x; // Update player position immediately on dash
    playerPos.y = data.cursorPosition.y; // Update player position immediately on dash

    let hitNote = false;
    const notesQuery = this.ecs.queryEntities(NoteComponent, PositionComponent);
    for (const noteEntity of notesQuery) {
        const noteComponent = this.ecs.getComponent(noteEntity, NoteComponent)!;
        const notePos = this.ecs.getComponent(noteEntity, PositionComponent)!;

        if (noteComponent.hit) continue; // Skip already hit notes

        const dx = playerPos.x - notePos.x;
        const dy = playerPos.y - notePos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

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
        this.eventManager.emit('player_miss_note', {});
    }
  }

  private handlePlayerDashFail(): void {
    // A rhythmic dash failed, so it's a miss for note interaction as well
    this.eventManager.emit('player_miss_note', {});
  }
}