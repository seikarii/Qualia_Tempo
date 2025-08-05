// src/systems/rendering/IRenderer.ts
import { Entity } from '../../ecs/Entity';
import {
  PositionComponent,
  RenderableComponent,
  HealthComponent,
  BuffComponent,
  TalentComponent,
} from '../../ecs/Component';

export interface IRenderer {
  initialize(canvas: HTMLCanvasElement): void;
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
    talents?: TalentComponent
  ): void;
  render(deltaTime: number, time: number): void;
  addAnimatedVFX(animation: (deltaTime: number) => boolean): void;
  getEntityObject(entityId: number): THREE.Object3D | undefined;
  getScene(): THREE.Scene;
  getCanvas(): HTMLCanvasElement;
}
