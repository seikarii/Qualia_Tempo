import type { Entity } from './Entity.js';
import { System } from './System.js';
import { Component, type ComponentConstructor } from './Component.js';
// Import all systems to be registered


export class ECSManager {
  private componentPools = new Map<
    ComponentConstructor<Component>,
    Map<Entity, Component>
  >();
  private systems = new Map<new (...args: unknown[]) => System, System>();
  private nextEntityId = 0;
  private entitiesToDestroy = new Set<Entity>();
  private activeEntities = new Set<Entity>();

  public getActiveEntities(): Set<Entity> {
    return this.activeEntities;
  }

  createEntity(): Entity {
    const entity = this.nextEntityId++;
    this.activeEntities.add(entity);
    return entity;
  }

  addComponent<T extends Component>(entity: Entity, component: T): T {
    const componentType = component.constructor as ComponentConstructor<T>;
    if (!this.componentPools.has(componentType)) {
      this.componentPools.set(componentType, new Map<Entity, Component>());
    }
    this.componentPools.get(componentType)!.set(entity, component);
    return component;
  }

  getComponent<T extends Component>(
    entity: Entity,
    componentType: ComponentConstructor<T>
  ): T | undefined {
    return this.componentPools.get(componentType)?.get(entity) as T | undefined;
  }

  hasComponent<T extends Component>(
    entity: Entity,
    componentType: ComponentConstructor<T>
  ): boolean {
    return this.componentPools.get(componentType)?.has(entity) ?? false;
  }

  removeComponent<T extends Component>(
    entity: Entity,
    componentType: ComponentConstructor<T>
  ): void {
    this.componentPools.get(componentType)?.delete(entity);
  }

  destroyEntity(entity: Entity): void {
    this.entitiesToDestroy.add(entity);
  }

  private removeEntity(entity: Entity): void {
    for (const pool of this.componentPools.values()) {
      pool.delete(entity);
    }
    this.activeEntities.delete(entity);
  }

  public entityExists(entity: Entity): boolean {
    return this.activeEntities.has(entity);
  }

  addSystem(system: System): void {
    system.ecs = this;
    this.systems.set(system.constructor as new (...args: unknown[]) => System, system);
  }

  getSystem<T extends System>(
    systemType: new (...args: unknown[]) => T
  ): T | undefined {
    return this.systems.get(systemType) as T | undefined;
  }

  update(deltaTime: number, time: number): void {
    for (const system of this.systems.values()) {
      system.update(deltaTime, time);
    }

    if (this.entitiesToDestroy.size > 0) {
      for (const entity of this.entitiesToDestroy) {
        this.removeEntity(entity);
      }
      this.entitiesToDestroy.clear();
    }
  }

  public clear(): void {
    this.componentPools.clear();
    this.systems.clear();
    this.entitiesToDestroy.clear();
    this.activeEntities.clear();
    this.nextEntityId = 0;
  }

  public getEntitiesByComponent<T extends Component>(componentType: ComponentConstructor<T>): Entity[] {
    const entities: Entity[] = [];
    const pool = this.componentPools.get(componentType);
    if (pool) {
      for (const entity of pool.keys()) {
        entities.push(entity);
      }
    }
    return entities;
  }

  *queryEntities<T extends Component[]>(
    ...componentTypes: { [K in keyof T]: ComponentConstructor<T[K]> }
  ): Iterable<Entity> {
    if (componentTypes.length === 0) {
      return;
    }

    let smallestPoolSize = Infinity;
    let smallestPool: Map<Entity, Component> | undefined;

    for (const componentType of componentTypes) {
      const pool = this.componentPools.get(componentType);
      if (!pool) {
        return;
      }
      if (pool.size < smallestPoolSize) {
        smallestPoolSize = pool.size;
        smallestPool = pool;
      }
    }

    if (!smallestPool) {
      return;
    }

    for (const entity of smallestPool.keys()) {
      let hasAll = true;
      for (const componentType of componentTypes) {
        if (!this.componentPools.get(componentType)!.has(entity)) {
          hasAll = false;
          break;
        }
      }

      if (hasAll) {
        yield entity;
      }
    }
  }
}