// Definición de un constructor de Componente para usar como clave e identificador.
// Esto nos da seguridad de tipos en lugar de usar strings.
export type ComponentConstructor<T extends Component> = new (
  ...args: unknown[]
) => T;

/**
 * Clase base para todos los componentes. Es una clase vacía que sirve como "etiqueta".
 * Los componentes deben ser clases para que puedan ser instanciados y referenciados en tiempo de ejecución.
 */
export class Component {
  public name: string;

  constructor(name: string) {
    this.name = name;
  }
}

// --- Core Components ---

export class PositionComponent extends Component {
  public x: number;
  public y: number;
  constructor(
    x: number = 0,
    y: number = 0
  ) {
    super('PositionComponent');
    this.x = x;
    this.y = y;
  }
}

export class VelocityComponent extends Component {
  public vx: number;
  public vy: number;
  constructor(
    vx: number = 0,
    vy: number = 0
  ) {
    super('VelocityComponent');
    this.vx = vx;
    this.vy = vy;
  }
}

export class HealthComponent extends Component {
  public max: number;
  public current: number;
  constructor(
    max: number,
    current: number = max
  ) {
    super('HealthComponent');
    this.max = max;
    this.current = current;
  }
}

export class RenderableComponent extends Component {
  public shape: 'circle' | 'diamond' | 'rectangle' | 'generative_boss';
  public width: number;
  public height: number;
  public color: string;
  public auraColor?: string;
  public isTelegraph: boolean;
  constructor(
    shape: 'circle' | 'diamond' | 'rectangle' | 'generative_boss',
    width: number,
    height: number,
    color: string = '#fff',
    auraColor?: string,
    isTelegraph: boolean = false // For semi-transparent rendering
  ) {
    super('RenderableComponent');
    this.shape = shape;
    this.width = width;
    this.height = height;
    this.color = color;
    this.auraColor = auraColor;
    this.isTelegraph = isTelegraph;
  }
}

export class PoolableComponent extends Component {
  public poolKey: string;
  public isActive: boolean;
  constructor(
    poolKey: string,
    isActive: boolean = false
  ) {
    super('PoolableComponent');
    this.poolKey = poolKey;
    this.isActive = isActive;
  }
}

// --- Gameplay & Ability Components ---

/** Un "tag component" para identificar al jugador. No tiene datos. */
export class PlayerComponent extends Component {
  constructor() {
    super('PlayerComponent');
  }
}

/** Un "tag component" para identificar a los bosses. No tiene datos. */
export class BossComponent extends Component {
  constructor() {
    super('BossComponent');
  }
}

export class ProjectileComponent extends Component {
  public owner: number; // Entity ID of the owner
  public damage: number;
  public speed: number;
  public lifetime: number;
  constructor(
    owner: number, // Entity ID of the owner
    damage: number,
    speed: number = 300,
    lifetime: number = 3 // seconds
  ) {
    super('ProjectileComponent');
    this.owner = owner;
    this.damage = damage;
    this.speed = speed;
    this.lifetime = lifetime;
  }
}

export class AoeComponent extends Component {
  public owner: number;
  public damage: number;
  public radius: number;
  public lifetime: number;
  constructor(
    owner: number,
    damage: number,
    radius: number,
    lifetime: number = 0.5 // Duration of the damage effect
  ) {
    super('AoeComponent');
    this.owner = owner;
    this.damage = damage;
    this.radius = radius;
    this.lifetime = lifetime;
  }
}

export class BeamComponent extends Component {
  public owner: number;
  public damage: number;
  public lifetime: number;
  public width: number;
  constructor(
    owner: number,
    damage: number, // Damage per second
    lifetime: number = 2,
    width: number = 20
  ) {
    super('BeamComponent');
    this.owner = owner;
    this.damage = damage;
    this.lifetime = lifetime;
    this.width = width;
  }
}

export class TelegraphComponent extends Component {
  public lifetime: number; // How long the telegraph is visible
  public abilityIdToTrigger: string; // Which ability to fire after the telegraph
  public owner: number;
  constructor(
    lifetime: number, // How long the telegraph is visible
    abilityIdToTrigger: string, // Which ability to fire after the telegraph
    owner: number
  ) {
    super('TelegraphComponent');
    this.lifetime = lifetime;
    this.abilityIdToTrigger = abilityIdToTrigger;
    this.owner = owner;
  }
}

export class ActiveBuffComponent extends Component {
  public buffId: string; // e.g., 'attackBoost' or 'sprint'
  public lifetime: number;
  public damageMultiplier: number;
  public speedMultiplier: number;
  constructor(
    buffId: string, // e.g., 'attackBoost' or 'sprint'
    lifetime: number,
    damageMultiplier: number = 1.0,
    speedMultiplier: number = 1.0
  ) {
    super('ActiveBuffComponent');
    this.buffId = buffId;
    this.lifetime = lifetime;
    this.damageMultiplier = damageMultiplier;
    this.speedMultiplier = speedMultiplier;
  }
}

export class BuffComponent extends Component {
  public comboCount: number;
  public damageMultiplier: number;
  public speedMultiplier: number;
  public lastPickupTime: number;
  public activeBuffs: Map<string, ActiveBuffComponent>;
  constructor(
    // Combo buff
    comboCount: number = 0,
    damageMultiplier: number = 1.0,
    speedMultiplier: number = 1.0,
    lastPickupTime: number = 0,
    // Active buffs from abilities
    activeBuffs: Map<string, ActiveBuffComponent> = new Map()
  ) {
    super('BuffComponent');
    this.comboCount = comboCount;
    this.damageMultiplier = damageMultiplier;
    this.speedMultiplier = speedMultiplier;
    this.lastPickupTime = lastPickupTime;
    this.activeBuffs = activeBuffs;
  }
}

export class TargetComponent extends Component {
  public targetEntityId: number;
  constructor(targetEntityId: number) {
    super('TargetComponent');
    this.targetEntityId = targetEntityId;
  }
}

export class AbilityComponent extends Component {
  public cooldowns: { [key: string]: number };
  public keybinds: { [key: string]: string };
  constructor(abilities: string[]) {
    // Referencia a las habilidades definidas en data/abilities.ts
    super('AbilityComponent');
    this.cooldowns = {};
    this.keybinds = {};
    abilities.forEach((ability) => (this.cooldowns[ability] = 0));
  }
}

export class TalentComponent extends Component {
  public talentPoints: number;
  public unlocked: Set<string>;
  constructor(
    talentPoints: number = 0,
    unlocked: Set<string> = new Set()
  ) {
    super('TalentComponent');
    this.talentPoints = talentPoints;
    this.unlocked = unlocked;
  }
}

export class AuraComponent extends Component {
  public damagePerSecond: number;
  public damageRadius: number;
  public effectType: 'none' | 'fire';
  public healingPerSecond: number;
  public projectileSpawner: {
    abilityId: string;
    interval: number;
    timer: number;
  } | null;
  public chainLightning: {
    damage: number;
    chains: number;
    interval: number;
    timer: number;
  } | null;
  constructor(
    // Damage props
    damagePerSecond: number = 0,
    damageRadius: number = 80,
    effectType: 'none' | 'fire' = 'none',
    // Healing props
    healingPerSecond: number = 0,
    // Projectile props
    projectileSpawner: {
      abilityId: string;
      interval: number;
      timer: number;
    } | null = null,
    // Chain lightning props
    chainLightning: {
      damage: number;
      chains: number;
      interval: number;
      timer: number;
    } | null = null
  ) {
    super('AuraComponent');
    this.damagePerSecond = damagePerSecond;
    this.damageRadius = damageRadius;
    this.effectType = effectType;
    this.healingPerSecond = healingPerSecond;
    this.projectileSpawner = projectileSpawner;
    this.chainLightning = chainLightning;
  }
}

export class AIComponent extends Component {
  public speed: number;
  public attackRange: number;
  public attackCooldown: number;
  public aggroRange: number;
  public aiType: 'conductor' | 'virtuoso' | 'minion';
  constructor(
    speed: number,
    attackRange: number = 150,
    attackCooldown: number = 2.0, // Time in seconds between attacks
    aggroRange: number = 400, // Range to start chasing
    aiType: 'conductor' | 'virtuoso' | 'minion' = 'minion'
  ) {
    super('AIComponent');
    this.speed = speed;
    this.attackRange = attackRange;
    this.attackCooldown = attackCooldown;
    this.aggroRange = aggroRange;
    this.aiType = aiType;
  }
}

export type AIState = 'IDLE' | 'CHASING' | 'ATTACKING' | 'PERFORMING';

export class StateMachineComponent extends Component {
  public currentState: AIState;
  public timeInState: number;
  public phrase: 'staccato' | 'legato' | 'finale';
  public phraseTimer: number;
  public phraseAttackCounter: number;
  constructor(
    currentState: AIState = 'IDLE',
    timeInState: number = 0,
    // State for Virtuoso's musical phrases
    phrase: 'staccato' | 'legato' | 'finale' = 'staccato',
    phraseTimer: number = 0,
    phraseAttackCounter: number = 0
  ) {
    super('StateMachineComponent');
    this.currentState = currentState;
    this.timeInState = timeInState;
    this.phrase = phrase;
    this.phraseTimer = phraseTimer;
    this.phraseAttackCounter = phraseAttackCounter;
  }
}

// --- Music & Scene Components ---



export class SceneComponent extends Component {
  public currentSceneId: string;
  constructor(currentSceneId: string) {
    super('SceneComponent');
    this.currentSceneId = currentSceneId;
  }
}

// --- Dialogue Components ---

export class DialogueComponent extends Component {
  public dialogueId: string; // ID del diálogo en data/dialogues.ts
  public currentLine: number;
  public active: boolean;
  constructor(
    dialogueId: string, // ID del diálogo en data/dialogues.ts
    currentLine: number = 0,
    active: boolean = false
  ) {
    super('DialogueComponent');
    this.dialogueId = dialogueId;
    this.currentLine = currentLine;
    this.active = active;
  }
}

export class DialogueTriggerComponent extends Component {
  public dialogueId: string;
  public triggered: boolean;
  constructor(
    dialogueId: string,
    triggered: boolean = false
  ) {
    super('DialogueTriggerComponent');
    this.dialogueId = dialogueId;
    this.triggered = triggered;
  }
}

/** Component for floor drops that trigger abilities. */
export class FloorDropComponent extends Component {
  public abilityId: string;
  public color: string;
  constructor(
    abilityId: string,
    color: string
  ) {
    super('FloorDropComponent');
    this.abilityId = abilityId;
    this.color = color;
  }
}

// --- Progression Components ---

export class CollisionComponent extends Component {
  public radius: number;
  constructor(radius: number) {
    super('CollisionComponent');
    this.radius = radius;
  }
}