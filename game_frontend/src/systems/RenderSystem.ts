import { ECSManager } from '../ecs/ECSManager.js';
import { System } from '../ecs/System.js';
import {
  PositionComponent,
  RenderableComponent,
  HealthComponent,
  BuffComponent,
  PlayerComponent,
  AIComponent,
  ProjectileComponent,
  TalentComponent,
} from '../ecs/Component.js';
import { IRenderer } from './rendering/IRenderer.js';
import { WebGLRenderer } from './rendering/WebGLRenderer.js';

export class RenderSystem extends System {
    private renderer: IRenderer;

    constructor(
        ecs: ECSManager,
        canvas: HTMLCanvasElement
    ) {
        super();
        this.ecs = ecs;
        this.renderer = new WebGLRenderer(canvas);
        this.renderer.setECS(ecs);
    }

  public getRenderer(): IRenderer {
    return this.renderer;
  }

  update(deltaTime: number, time: number): void {
    if (!this.ecs) return;

    // Limpieza de entidades que ya no existen en el ECS
    const activeEntities = new Set(this.ecs.queryEntities().map(e => e));
    this.renderer.cleanup(activeEntities);

    this.renderer.drawBackground(
      time,
      0.5, // Default intensity
      false // Default beat
    );

    const query = this.ecs.queryEntities(
      PositionComponent,
      RenderableComponent
    );
    for (const entity of query) {
      const pos = this.ecs.getComponent(entity, PositionComponent)!;
      const renderable = this.ecs.getComponent(entity, RenderableComponent)!;
      const health = this.ecs.getComponent(entity, HealthComponent);
      const buff = this.ecs.getComponent(entity, BuffComponent);
      const talents = this.ecs.getComponent(entity, TalentComponent);

      const isPlayer = this.ecs.hasComponent(entity, PlayerComponent);
      const isEnemy = this.ecs.hasComponent(entity, AIComponent);
      const isProjectile = this.ecs.hasComponent(entity, ProjectileComponent);

      this.renderer.drawEntity(
        entity,
        pos,
        renderable,
        isPlayer,
        isEnemy,
        isProjectile,
        health,
        buff,
        talents
      );
    }

    // Al final, renderizamos toda la escena 3D de una vez
    this.renderer.render(deltaTime, time);
  }
}
