import { System } from '../ecs/System.js';
import { ECSManager } from '../ecs/ECSManager.js';
import { EventManager } from '../events/EventManager.js';
import {
  AIComponent,
  PositionComponent,
  HealthComponent,
  StateMachineComponent,
  BossComponent,
} from '../ecs/Component.js';
import { QualiaState } from '../ecs/components/QualiaState.js';
import { GameEvent } from '../events/GameEvents.js';

export class BossAISystem extends System {
  constructor(ecs: ECSManager, eventManager: EventManager) {
    super();
    this.ecs = ecs;
    this.eventManager = eventManager;
  }

  update(deltaTime: number, time: number): void {
    const bossEntities = this.ecs.queryEntities(
      BossComponent,
      AIComponent,
      PositionComponent,
      HealthComponent,
      StateMachineComponent
    );

    for (const bossEntity of bossEntities) {
      const ai = this.ecs.getComponent(bossEntity, AIComponent)!;
      const pos = this.ecs.getComponent(bossEntity, PositionComponent)!;
      const health = this.ecs.getComponent(bossEntity, HealthComponent)!;
      const stateMachine = this.ecs.getComponent(bossEntity, StateMachineComponent)!;

      const qualiaEntities = this.ecs.getEntitiesByComponent(QualiaState);
      const qualiaState = qualiaEntities.length > 0 ? this.ecs.getComponent(qualiaEntities[0], QualiaState) : null;

      if (!qualiaState) continue; // QualiaState is crucial for boss behavior

      stateMachine.timeInState += deltaTime;

      switch (stateMachine.currentState) {
        case 'IDLE':
          this.handleIdleState(bossEntity, ai, pos, health, stateMachine, qualiaState);
          break;
        case 'CHASING':
          this.handleChasingState(bossEntity, ai, pos, health, stateMachine, qualiaState);
          break;
        case 'ATTACKING':
          this.handleAttackingState(bossEntity, ai, pos, health, stateMachine, qualiaState);
          break;
        case 'PERFORMING':
          this.handlePerformingState(bossEntity, ai, pos, health, stateMachine, qualiaState);
          break;
      }

      // Boss health check for defeat
      if (health.current <= 0) {
        this.eventManager.emit(GameEvent.BossDefeated, { bossId: bossEntity });
        this.ecs.destroyEntity(bossEntity);
      }
    }
  }

  private handleIdleState(
    bossEntity: number,
    ai: AIComponent,
    pos: PositionComponent,
    health: HealthComponent,
    stateMachine: StateMachineComponent,
    qualiaState: QualiaState
  ): void {
    // Transition to CHASING if player is within aggro range or Qualia intensity is high
    // For now, let's assume player is always at (0,0) for simplicity
    const playerPos = { x: 0, y: 0 }; // Placeholder: Get actual player position
    const distanceToPlayer = Math.sqrt(
      (pos.x - playerPos.x) ** 2 + (pos.y - playerPos.y) ** 2
    );

    if (distanceToPlayer < ai.aggroRange || qualiaState.intensity > 0.5) {
      stateMachine.currentState = 'CHASING';
      stateMachine.timeInState = 0;
      console.log(`Boss ${bossEntity} transitioning to CHASING`);
    }
  }

  private handleChasingState(
    bossEntity: number,
    ai: AIComponent,
    pos: PositionComponent,
    health: HealthComponent,
    stateMachine: StateMachineComponent,
    qualiaState: QualiaState
  ): void {
    // Move towards player
    const playerPos = { x: 0, y: 0 }; // Placeholder: Get actual player position
    const directionX = playerPos.x - pos.x;
    const directionY = playerPos.y - pos.y;
    const magnitude = Math.sqrt(directionX ** 2 + directionY ** 2);

    if (magnitude > ai.attackRange) {
      pos.x += (directionX / magnitude) * ai.speed * this.ecs.deltaTime; // Use ecs.deltaTime
      pos.y += (directionY / magnitude) * ai.speed * this.ecs.deltaTime; // Use ecs.deltaTime
    } else {
      stateMachine.currentState = 'ATTACKING';
      stateMachine.timeInState = 0;
      console.log(`Boss ${bossEntity} transitioning to ATTACKING`);
    }
  }

  private handleAttackingState(
    bossEntity: number,
    ai: AIComponent,
    pos: PositionComponent,
    health: HealthComponent,
    stateMachine: StateMachineComponent,
    qualiaState: QualiaState
  ): void {
    // Perform attacks based on boss type and QualiaState
    stateMachine.phraseTimer += this.ecs.deltaTime; // Use ecs.deltaTime

    if (stateMachine.phraseTimer >= ai.attackCooldown) {
      // Perform attack
      console.log(`Boss ${bossEntity} performing attack!`);
      // Emit event for attack animation/damage calculation
      this.eventManager.emit(GameEvent.AbilityCasted, { entityId: bossEntity, abilityId: 'boss_attack' });

      stateMachine.phraseAttackCounter++;
      stateMachine.phraseTimer = 0;

      // Transition back to CHASING or to PERFORMING based on attack counter/health/qualia
      if (stateMachine.phraseAttackCounter >= 3 || health.current < health.max * 0.5) {
        stateMachine.currentState = 'PERFORMING';
        stateMachine.timeInState = 0;
        stateMachine.phraseAttackCounter = 0;
        console.log(`Boss ${bossEntity} transitioning to PERFORMING`);
      } else {
        stateMachine.currentState = 'CHASING';
        stateMachine.timeInState = 0;
        console.log(`Boss ${bossEntity} transitioning to CHASING`);
      }
    }
  }

  private handlePerformingState(
    bossEntity: number,
    ai: AIComponent,
    pos: PositionComponent,
    health: HealthComponent,
    stateMachine: StateMachineComponent,
    qualiaState: QualiaState
  ): void {
    // Boss performs a special move or phase transition
    console.log(`Boss ${bossEntity} performing special move!`);
    // Example: Emit a special ability event based on qualiaState
    if (qualiaState.transcendence > 0.8) {
      this.eventManager.emit(GameEvent.AbilityCasted, { entityId: bossEntity, abilityId: 'boss_ultimate_attack' });
    } else {
      this.eventManager.emit(GameEvent.AbilityCasted, { entityId: bossEntity, abilityId: 'boss_special_attack' });
    }

    // Transition back to IDLE or CHASING after a delay
    if (stateMachine.timeInState >= 5) { // Perform for 5 seconds
      stateMachine.currentState = 'IDLE';
      stateMachine.timeInState = 0;
      console.log(`Boss ${bossEntity} transitioning to IDLE`);
    }
  }
}
