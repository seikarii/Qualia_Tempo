import { ECSManager } from '../ecs/ECSManager';
import { Entity } from '../ecs/Entity';
import { Component, ComponentConstructor } from '../ecs/Component';

export function getComponentForEntity<T extends Component>(
  ecs: ECSManager,
  componentType: ComponentConstructor<T>,
  entity?: Entity
): T | undefined {
  const targetEntity = entity || ecs.getEntitiesByComponent(componentType)[0];
  if (!targetEntity) {
    return undefined;
  }
  return ecs.getComponent<T>(targetEntity, componentType);
}
