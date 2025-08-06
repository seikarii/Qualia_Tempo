import { ECSManager } from '../../ecs/ECSManager';
import { PositionComponent, RenderableComponent, HealthComponent, BuffComponent, TalentComponent, AIComponent, ProjectileComponent } from '../../ecs/Component';
import { NoteComponent } from '../../ecs/components/NoteComponent';
import type { Entity } from '../../ecs/Entity';

export interface IRenderer {
    setECS(ecs: ECSManager): void;
    cleanup(activeEntities: Set<Entity>): void;
    drawBackground(time: number, intensity: number, beat: boolean): void;
    drawEntity(
        entity: Entity,
        pos: PositionComponent,
        renderable: RenderableComponent,
        isPlayer: boolean,
        isEnemy: boolean,
        isProjectile: boolean,
        health?: HealthComponent,
        buff?: BuffComponent,
        talents?: TalentComponent,
        note?: NoteComponent
    ): void;
    render(deltaTime: number, time: number): void;
}