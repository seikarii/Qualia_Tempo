import { System } from '../ecs/System.js';
import {
  PositionComponent,
  PlayerComponent,
  RenderableComponent,
} from '../ecs/Component.js';
import type { NoteComponent } from '../ecs/components/NoteComponent.js';
import { Entity } from '../ecs/Entity.js';
import { GameEvent } from '../events/GameEvents.js';
import { EventManager } from '../events/EventManager.js';
import { ECSManager } from '../ecs/ECSManager.js';
import { CombatManager } from '../data/CombatManager.js';
import type { NoteData } from '../data/CombatData.js';

export class FloorSystem extends System {
    private combatManager: CombatManager;
    private eventManager: EventManager;
    private playerEntity: Entity | null = null;
    private currentCombatId: string | null = null;
    private notesToSpawn: NoteData[] = [];
    private spawnedNotes: Map<Entity, NoteComponent> = new Map();
    private gameTime: number = 0; // To track time for note spawning

    constructor(
        ecs: ECSManager,
        eventManager: EventManager,
        combatManager: CombatManager
    ) {
        super();
        this.ecs = ecs; // Assign ecs from constructor
        this.eventManager = eventManager;
        this.combatManager = combatManager;

        this.eventManager.on(GameEvent.SceneLoaded, this.handleSceneLoaded.bind(this));
        this.eventManager.on('player_dash_success', this.handlePlayerDash.bind(this));
        this.eventManager.on('player_dash_fail', this.handlePlayerDash.bind(this));
    }

    public update(deltaTime: number, time: number): void {
        this.gameTime = time; // Update game time

        if (!this.playerEntity) {
            const playerEntities: Entity[] = this.ecs.getEntitiesByComponent(PlayerComponent);
            if (playerEntities.length > 0) {
                this.playerEntity = playerEntities[0];
            }
            if (!this.playerEntity) return;
        }

        // Spawn notes based on combat data
        this.spawnNotes();

        // Update and check spawned notes for lifecycle and player interaction
        this.updateSpawnedNotes();
    }

    private handleSceneLoaded(data: { sceneId: string }) {
        // Assuming sceneId can be mapped to a combatId
        this.currentCombatId = data.sceneId; // Or derive from sceneId
        const combatData = this.combatManager.getCombatData(this.currentCombatId);
        if (combatData) {
            this.notesToSpawn = [...combatData.noteMap].sort((a, b) => a.timestamp - b.timestamp);
            this.spawnedNotes.clear(); // Clear any previous notes
            this.gameTime = 0; // Reset game time for new combat
            console.log(`Loaded ${this.notesToSpawn.length} notes for combat ${this.currentCombatId}`);
        } else {
            console.warn(`No combat data found for scene: ${data.sceneId}`);
        }
    }

    private spawnNotes(): void {
        while (this.notesToSpawn.length > 0 && this.notesToSpawn[0].timestamp <= this.gameTime / 1000) {
            const noteData: NoteData | undefined = this.notesToSpawn.shift();
            if (noteData) {
                const noteEntity: Entity = this.ecs.createEntity();
                const noteComponent = new NoteComponent(noteData.position, this.gameTime, noteData.duration, '#FFFF00'); // Example color
                this.ecs.addComponent(noteEntity, noteComponent);
                this.ecs.addComponent(noteEntity, new PositionComponent(noteData.position.x, noteData.position.y));
                this.ecs.addComponent(noteEntity, new RenderableComponent('rectangle', 50, 50, noteComponent.color));
                this.spawnedNotes.set(noteEntity, noteComponent);
                this.eventManager.emit(GameEvent.FloorTileSpawned, { tileId: noteEntity, position: noteData.position, color: noteComponent.color });
                console.log(`Spawned note at ${noteData.timestamp}s`);
            }
        }
    }

    private updateSpawnedNotes(): void {
        const playerPositionComponent = this.playerEntity ? this.ecs.getComponent(this.playerEntity, PositionComponent) : null;
        if (!playerPositionComponent) return;

        for (const [entity, noteComponent] of this.spawnedNotes.entries()) {
            // Check note lifecycle
            if ((this.gameTime - noteComponent.spawnTime) / 1000 > noteComponent.duration) {
                this.eventManager.emit(GameEvent.FloorTileCollected, { tileId: entity, color: noteComponent.color }); // Treat as missed
                this.eventManager.emit('player_miss_note', { noteId: entity });
                this.ecs.destroyEntity(entity);
                this.spawnedNotes.delete(entity);
                continue;
            }

            // Check player collision (simplified for now)
            const dx: number = playerPositionComponent.x - noteComponent.position.x;
            const dy: number = playerPositionComponent.y - noteComponent.position.y;
            const distance: number = Math.sqrt(dx * dx + dy * dy);

            // If player is close enough and note hasn't been hit yet
            if (distance < 50 && !noteComponent.hit) { // 50 is a placeholder radius
                // This is where the rhythmic check from useRhythmicInput comes in.
                // For now, we'll assume a dash event means an attempt to hit.
                // The actual hit/miss will be determined by the rhythmic input system.
            }
        }
    }

    private handlePlayerDash(data: { noteId?: Entity }) {
        // This event is emitted by useRhythmicInput when a dash attempt occurs.
        // We need to check if the player was near a note when the dash occurred.
        const playerPositionComponent = this.playerEntity ? this.ecs.getComponent(this.playerEntity, PositionComponent) : null;
        if (!playerPositionComponent) return;

        let hitNoteThisDash: boolean = false;
        for (const [entity, noteComponent] of this.spawnedNotes.entries()) {
            if (noteComponent.hit) continue; // Already hit

            const dx: number = playerPositionComponent.x - noteComponent.position.x;
            const dy: number = playerPositionComponent.y - noteComponent.position.y;
            const distance: number = Math.sqrt(dx * dx + dy * dy);

            if (distance < 50) { // Player is near a note
                // The actual hit/miss decision is made by useRhythmicInput based on rhythm.
                // If useRhythmicInput emitted 'player_dash_success', then it's a hit.
                // If it emitted 'player_dash_fail', then it's a miss (even if near a note).
                // This system just needs to react to those events and mark the note.
                if (data.noteId === entity) { // If the event specifically targets this note
                    noteComponent.hit = true;
                    this.eventManager.emit('player_hit_note', { noteId: entity });
                    this.ecs.destroyEntity(entity);
                    this.spawnedNotes.delete(entity);
                    hitNoteThisDash = true;
                    break; // Only hit one note per dash for now
                }
            }
        }
        // If a dash occurred but no note was hit, it's a miss for the purpose of notes
        if (!hitNoteThisDash && data.noteId === undefined) { // Only if it's a general dash event, not tied to a specific note
             // This logic might need to be refined. If useRhythmicInput already determines hit/miss,
             // this system just needs to react to those specific events.
        }
    }
