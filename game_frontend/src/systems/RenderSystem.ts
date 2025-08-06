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
import { NoteComponent } from '../ecs/components/NoteComponent.js';
import type { IRenderer } from './rendering/IRenderer.js';
import { WebGLRenderer } from './rendering/WebGLRenderer.js';
import { config } from '../config';

/**
 * The system responsible for rendering the game.
 */
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

  /**
   * Gets the renderer.
   * @returns The renderer.
   */
  public getRenderer(): IRenderer {
    return this.renderer;
  }

  /**
   * Updates the render system.
   * @param deltaTime The time since the last update.
   * @param time The current time.
   */
  update(deltaTime: number, time: number): void {
    if (!this.ecs) return;

    // Limpieza de entidades que ya no existen en el ECS
    const activeEntities = new Set(Array.from(this.ecs.queryEntities()).map((e: number) => e));
    this.renderer.cleanup(activeEntities);

    this.renderer.drawBackground(
      time,
      config.RENDER_SYSTEM.PLAYER_AURA_OPACITY, // Default intensity
      false // Default beat
    );

    const query: number[] = this.ecs.queryEntities(
      PositionComponent,
      RenderableComponent
    );
    for (const entity of Array.from(query)) {
      const pos = this.ecs.getComponent(entity, PositionComponent)!;
      const renderable = this.ecs.getComponent(entity, RenderableComponent)!;
      const health = this.ecs.getComponent(entity, HealthComponent);
      const buff = this.ecs.getComponent(entity, BuffComponent);
      const talents = this.ecs.getComponent(entity, TalentComponent);
      const note = this.ecs.getComponent(entity, NoteComponent);

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
        talents,
        note
      );
    }

    // Al final, renderizamos toda la escena 3D de una vez
    this.renderer.render(deltaTime, time);
  }
}
