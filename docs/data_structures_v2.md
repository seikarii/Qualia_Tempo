# Estructuras de Datos - Versión 2.0

Este documento define las estructuras de datos principales del juego, diseñadas para soportar la arquitectura futura de Qualia Tempo.

## Tabla de Contenidos
1. [Estados del Juego](#estados-del-juego)
   - [QualiaState](#qualiastate)
   - [PlayerState](#playerstate)
   - [BossState](#bossstate)
   - [CombatState](#combatstate)
2. [Datos de Combate](#datos-de-combate)
   - [CombatData](#combatdata)
   - [MusicalComboData](#musicalcombodata)
   - [PatternData](#patterndata)
   - [LyricData](#lyricdata)
3. [Sistema de Partículas](#sistema-de-partículas)
   - [ParticleSystemConfig](#particlesystemconfig)
   - [ParticleEffect](#particleeffect)
4. [Audio](#audio)
   - [AudioEvent](#audioevent)
   - [AudioLayer](#audiolayer)

## Estados del Juego

### QualiaState
Representa el estado de maestría del jugador, utilizado para impulsar la generación procedural de efectos visuales y de audio.

```typescript
export interface IQualiaState {
  // Estados base
  intensity: number;        // Nivel general de Qualia (0-1)
  precision: number;        // Precisión del jugador (0-1)
  aggression: number;       // Agresividad en el juego (0-1)
  flow: number;             // Fluidez y ritmo (0-1)
  chaos: number;           // Caos y desorden (0-1)
  recovery: number;        // Recuperación y defensa (0-1)
  transcendence: number;   // Estado de Ultimate (0-1)
  
  // Metadatos
  timestamp: number;       // Tiempo en segundos desde el inicio
  combo: number;           // Combo actual
  maxCombo: number;        // Máximo combo alcanzado
  
  // Estadísticas avanzadas
  accuracy: number;        // Precisión general (0-1)
  rhythmConsistency: number; // Consistencia rítmica (0-1)
  aggressionPeak: number;  // Pico de agresión alcanzado
  
  // Estado del entorno
  bossPhase: number;       // Fase actual del jefe
  environmentEffects: IEnvironmentEffect[]; // Efectos ambientales activos
  
  // Generación y Recolección de Qualia (QUALIA.CODE Enhancement)
  lastGenerationSource: 'playerDash' | 'bossAbility' | 'metronomeTick' | 'musicalNote' | 'unknown'; // Origen de la última generación de Qualia
  color: Color;            // Color actual del Qualia basado en el contexto musical
  collectionWindowEnd: number; // Timestamp que indica el fin de la ventana de recolección (max 1 sec)
}
```

### PlayerState
Representa el estado actual del jugador.

```typescript
export interface IPlayerState {
  position: Vector2;       // Posición en el escenario
  health: number;          // Salud actual (0-100)
  maxHealth: number;       // Salud máxima
  musicalAbilities: { [key: string]: IMusicalAbilityState; }; // e.g., { 'Q': { cooldown: 5, lastUsed: 1000 } }
  specialAbilityCharge: number; // Current charge for the ultimate ability (0-40)
  buffs: IBuff[];          // Buffs activos
  debuffs: IDebuff[];      // Debuffs activos
  rhythmMultiplier: number; // Multiplicador de ritmo actual
  combo: number;           // Combo actual
  score: number;           // Puntuación actual
  dashCooldown: number;    // Tiempo restante para el siguiente dash
  isInvulnerable: boolean; // Indica si el jugador es invulnerable
  
  // Ultimate System (QUALIA.CODE Enhancement)
  isUltimateActive: boolean; // Indica si la habilidad especial está activa
  ultimateActivationTimestamp?: number; // Timestamp de activación del ultimate para efectos 8D
}

export interface IMusicalAbilityState {
  cooldown: number; // Time remaining on cooldown
  lastUsed: number; // Timestamp of last use
  level: number;    // Level or power of the ability
  
  // Audio Effects System (QUALIA.CODE Enhancement)
  effectAudioEventId?: string; // ID del evento de audio específico (ej. coro, orquesta)
  qualiaGenerationModifier?: number; // Modificador de generación de Qualia (ej. duplicación en ultimate)
}
```

### BossState
Representa el estado actual del jefe.

```typescript
export interface IBossState {
  id: string;             // Identificador único del jefe
  name: string;           // Nombre del jefe
  health: number;         // Salud actual (0-100)
  maxHealth: number;      // Salud máxima
  phase: number;          // Fase actual (1-3)
  position: Vector2;      // Posición en el escenario
  targetPosition: Vector2; // Posición objetivo
  currentPattern: string; // ID del patrón actual
  nextPatternTime: number; // Tiempo hasta el siguiente patrón
  isVulnerable: boolean;  // Indica si el jefe puede recibir daño
  enrageTimer: number;    // Tiempo restante hasta enrage
  buffs: IBossBuff[];     // Buffs activos
  debuffs: IBossDebuff[]; // Debuffs activos
  
  // Dynamic Aggression System (QUALIA.CODE Enhancement)
  currentAggressionLevel: number; // Nivel de agresión actual influenciado por tempo y volumen de la música
}
```

### CombatState
Estado general del combate.

```typescript
export interface ICombatState {
  isActive: boolean;      // Indica si el combate está en curso
  startTime: number;      // Tiempo de inicio del combate
  elapsedTime: number;    // Tiempo transcurrido desde el inicio
  songProgress: number;   // Progreso de la canción (0-1)
  difficulty: number;     // Dificultad actual (0-1)
  intensity: number;      // Intensidad del combate (0-1)
  player: IPlayerState;   // Estado del jugador
  boss: IBossState;       // Estado del jefe
  qualiaState: IQualiaState; // Estado de Qualia actualizado
  activeEffects: IEffect[]; // Efectos visuales/auditivos activos
  comboHistory: number[];  // Historial de combos
  hitHistory: IHitEvent[]; // Historial de golpes
  
  // Dynamic Music System (QUALIA.CODE Enhancement)
  currentTempoMultiplier: number; // Multiplicador de tempo basado en combo y intensidad de Qualia
  currentVolumeLevel: number;     // Nivel de volumen actual basado en configuración de dificultad y combo
  songData: ISongData;           // Datos completos de la canción actual
  musicalInputAnalysis: IMusicalInputAnalysis; // Análisis de armonía del input del jugador
  qualiaEventHistory: IQualiaEvent[];         // Historial reciente de eventos de Qualia
}
```

## Datos de Combate

### CombatData
Estructura principal para los datos de combate.

```typescript
export interface ICombatData {
  id: string;             // Identificador único del combate
  bossId: string;         // ID del jefe
  song: ISongData;        // Datos de la canción
  patterns: IPatternData[]; // Patrones de ataque
  lyrics: ILyricData[];   // Letras sincronizadas
  musicalCombos: IMusicalComboData[]; // List of all possible musical combos for this combat
  difficultyCurve: {
    time: number;         // Tiempo en segundos
    value: number;        // Valor de dificultad (0-1)
  }[];
  phases: IBossPhase[];   // Fases del jefe
  victoryConditions: IVictoryCondition[]; // Condiciones de victoria
  failureConditions: IFailureCondition[]; // Condiciones de derrota
}
```

### MusicalComboData
Define las combinaciones de notas que generan efectos emergentes.

```typescript
export interface IMusicalComboData {
  id: string;
  name: string;
  sequence: string[]; // e.g., ['Q', 'E', 'R'] - ordered sequence of keys
  effect: 'vortex' | 'attractor' | 'repulsor' | 'heal' | 'shield' | 'boost'; // Specific effect triggered
  type: 'beneficial' | 'detrimental' | 'neutral'; // Nature of the effect
  description: string; // Human-readable description of the combo effect
  
  // Harmony System (QUALIA.CODE Enhancement)
  harmonyRequirement: { min: number; max: number; }; // Rango de armonía requerido (0-1, donde 0=caótico, 1=armónico)
  musicalNoteSequence: string[]; // Secuencia de notas musicales que activa el combo además de las teclas
}
```

### PatternData
Datos para los patrones de ataque del jefe.

```typescript
export interface IPatternData {
  id: string;             // Identificador único del patrón
  name: string;           // Nombre descriptivo
  type: 'projectile' | 'melee' | 'aoe' | 'movement' | 'special';
  difficulty: number;     // Dificultad base (0-1)
  duration: number;       // Duración en segundos
  cooldown: number;       // Tiempo de enfriamiento mínimo
  telegraphTime: number;  // Tiempo de advertencia
  hitbox: IHitbox;        // Zona de daño
  damage: number;         // Daño base
  effects: IEffectData[]; // Efectos aplicados al golpear
  audioCue: string;       // Pista de audio para la señal
  visualCue: string;      // Efecto visual para la señal
  spawnRules: ISpawnRule[]; // Reglas de aparición
  movementPattern: IMovementPattern; // Patrón de movimiento
  phase: number;          // Fase en la que aparece (0 = todas)
  weight: number;         // Peso para selección aleatoria
  
  // Boss Ability Enhancement (QUALIA.CODE Enhancement)
  color: Color;           // Color del ataque (por defecto morado/negro para jefe)
  intensityInfluence: { minSongIntensity: number; maxSongIntensity: number; }; // Influencia de la intensidad de la canción
  destroyableByMusicalComboId?: string; // ID del combo musical que puede destruir este patrón
  generatesQualia: boolean;            // Si este patrón genera Qualia al ejecutarse
  qualiaGenerationAmount?: number;     // Cantidad de Qualia generada si generatesQualia es true
}
```

### LyricData
Datos para las letras sincronizadas.

```typescript
export interface ILyricData {
  id: string;             // Identificador único
  text: string;           // Texto de la letra
  timestamp: number;      // Time in seconds when the lyric should appear
  emotion: string;        // Emoción asociada
  intensity: number;      // Intensidad (0-1)
  triggers: string[];     // Eventos que dispara
  visualEffects: IVisualEffect[]; // Efectos visuales asociados
  audioEffects: IAudioEffect[];   // Efectos de audio asociados
}
```

## Sistema de Partículas

### ParticleSystemConfig
Configuración del sistema de partículas.

```typescript
export interface IParticleSystemConfig {
  maxParticles: number;   // Número máximo de partículas
  emissionRate: number;   // Partículas por segundo
  lifetime: Range;        // Duración de vida (min, max)
  size: Range;            // Tamaño de las partículas
  speed: Range;           // Velocidad inicial
  angle: Range;           // Ángulo de emisión
  gravity: Vector2;       // Gravedad aplicada
  startColor: ColorRange; // Color inicial
  endColor: ColorRange;   // Color final
  blendMode: string;      // Modo de mezcla
  texture: string;        // Textura de las partículas
  shape: string;          // Forma de emisión
  burst: ParticleBurst[]; // Ráfagas de partículas
  forceOverLifetime: ForceOverLifetime; // Fuerzas a lo largo de la vida
  sizeOverLifetime: Curve; // Tamaño a lo largo de la vida
  colorOverLifetime: Gradient; // Color a lo largo de la vida
  emissionOverTime: Curve; // Emisión a lo largo del tiempo
  subEmitters: SubEmitter[]; // Subemisores
  collision: CollisionSettings; // Configuración de colisiones
}
```

### ParticleEffect
Definición de un efecto de partículas.

```typescript
export interface IParticleEffect {
  id: string;             // Identificador único
  name: string;           // Nombre descriptivo
  system: IParticleSystemConfig; // Configuración del sistema
  duration: number;       // Duración del efecto (-1 = infinito)
  loop: boolean;          // Si se repite
  prewarm: boolean;       // Precálculo de partículas
  startDelay: number;     // Retraso inicial
  startLifetime: Range;   // Duración de vida inicial
  startSpeed: Range;      // Velocidad inicial
  startSize: Range;       // Tamaño inicial
  startRotation: Range;   // Rotación inicial
  startColor: Color;      // Color inicial
  gravityModifier: number; // Modificador de gravedad
  simulationSpace: 'local' | 'world'; // Espacio de simulación
  scalingMode: 'hierarchy' | 'local' | 'shape'; // Modo de escalado
  playOnAwake: boolean;   // Reproducir al crear
  maxParticles: number;   // Máximo de partículas
  emission: EmissionModule; // Módulo de emisión
  shape: ShapeModule;     // Módulo de forma
  velocityOverLifetime: VelocityOverLifetimeModule;
  limitVelocityOverLifetime: LimitVelocityOverLifetimeModule;
  inheritVelocity: InheritVelocityModule;
  forceOverLifetime: ForceOverLifetimeModule;
  colorOverLifetime: ColorOverLifetimeModule;
  colorBySpeed: ColorBySpeedModule;
  sizeOverLifetime: SizeOverLifetimeModule;
  sizeBySpeed: SizeBySpeedModule;
  rotationOverLifetime: RotationOverLifetimeModule;
  rotationBySpeed: RotationBySpeedModule;
  externalForces: ExternalForcesModule;
  noise: NoiseModule;
  collision: CollisionModule;
  triggers: TriggersModule;
  subEmitters: SubEmittersModule;
  textureSheetAnimation: TextureSheetAnimationModule;
  lights: LightsModule;
  trails: TrailModule;
  customData: CustomDataModule;
}
```

## Audio

### AudioEvent
Evento de audio para el sistema de audio.

```typescript
export interface IAudioEvent {
  id: string;             // Identificador único
  type: 'play' | 'stop' | 'pause' | 'resume' | 'parameter';
  clipId: string;         // ID del clip de audio
  delay: number;          // Retraso en segundos
  volume: number;         // Volumen (0-1)
  pitch: number;          // Tono (0.5-2.0)
  loop: boolean;          // Si se repite
  position?: Vector3;     // Posición 3D
  spatialBlend: number;   // Mezcla espacial (0-1)
  minDistance: number;    // Distancia mínima
  maxDistance: number;    // Distancia máxima
  output: string;         // Grupo de salida
  parameters: AudioParameter[]; // Parámetros dinámicos
}
```

### AudioLayer
Capa de audio para mezcla dinámica.

```typescript
export interface IAudioLayer {
  id: string;             // Identificador único
  name: string;           // Nombre descriptivo
  volume: number;         // Volumen base (0-1)
  mute: boolean;          // Si está silenciado
  solo: boolean;          // Si está en modo solo
  bypassEffects: boolean; // Si ignora los efectos
  effects: AudioEffect[]; // Efectos de audio
  clips: AudioClip[];     // Clips de audio
  loop: boolean;          // Si se repite
  fadeIn: number;         // Tiempo de fade in (segundos)
  fadeOut: number;        // Tiempo de fade out (segundos)
  crossfade: number;      // Tiempo de crossfade entre clips
  priority: number;       // Prioridad de mezcla
  spatialBlend: number;   // Mezcla espacial (0-1)
  spread: number;         // Dispersión (0-360)
  dopplerLevel: number;   // Nivel de efecto Doppler
  minDistance: number;    // Distancia mínima
  maxDistance: number;    // Distancia máxima
  rolloffMode: 'linear' | 'logarithmic' | 'custom'; // Modo de atenuación
  customRolloff: IAnimationCurve; // Curva de atenuación personalizada
  reverbZoneMix: number;  // Mezcla de zona de reverberación
  
  // Dynamic Tempo System (QUALIA.CODE Enhancement)
  tempoMultiplier: number; // Multiplicador de tempo dinámico para manipulación musical
  spread: number;         // Dispersión (0-360)
  panStereo: number;      // Panorama estéreo (-1 a 1)
  bypassListenerEffects: boolean; // Ignorar efectos del oyente
  bypassReverbZones: boolean; // Ignorar zonas de reverberación
  playOnAwake: boolean;   // Reproducir al crear
  loop: boolean;          // Repetir
  mute: boolean;          // Silenciar
  pitch: number;          // Tono (0.5-2.0)
  time: number;           // Tiempo actual de reproducción
  timeSamples: number;    // Tiempo actual en muestras
  velocityUpdateMode: 'auto' | 'fixed' | 'dynamic'; // Actualización de velocidad
  ignoreListenerPause: boolean; // Ignorar pausa del oyente
  ignoreListenerVolume: boolean; // Ignorar volumen del oyente
}
```

## New Interfaces (QUALIA.CODE Enhancement)

### Core Qualia System

```typescript
/**
 * Event emitted when Qualia is generated or collected
 * Supports complete traceability of Qualia lifecycle and 8D audio positioning
 */
export interface IQualiaEvent {
  id: string;                     // Unique identifier for this Qualia event
  type: 'generated' | 'collected'; // Event type
  source: 'playerDash' | 'bossAbility' | 'metronomeTick' | 'musicalNote'; // Source of generation
  timestamp: number;              // Timestamp of the event
  position: Vector2;              // Position where the event occurred
  color: Color;                   // Color of the Qualia based on musical context
  associatedSoundId?: string;     // ID of sound event for echo and 8D audio effects
  associatedVisualEffectId?: string; // ID of visual effect for light and particle effects
  value: number;                  // Amount of Qualia generated/collected
}
```

### Music & Song System

```typescript
/**
 * Complete song data structure for dynamic audio manipulation
 * CRITICAL: Missing interface that drives the entire musical system
 */
export interface ISongData {
  id: string;                     // Unique song identifier
  name: string;                   // Song title
  artist: string;                 // Artist name
  duration: number;               // Duration in seconds
  bpm: number;                    // Base beats per minute
  metronomeTicks: { timestamp: number; intensity: number; }[]; // Metronome ticks for Qualia generation
  musicalNotes: { timestamp: number; note: string; frequency: number; intensity: number; }[]; // Musical notes for Qualia generation and harmony checks
  intensityCurve: { time: number; value: number; }[]; // Song intensity curve over time
  volumeCurve: { time: number; value: number; }[];   // Volume curve over time
  audioFilePath: string;          // Path to audio file
  isUserGenerated: boolean;       // Copyright workaround - user-uploaded content
}

/**
 * Musical harmony analysis for player input validation
 */
export interface IMusicalInputAnalysis {
  currentHarmonyScore: number;    // Harmony score (0-1) based on player input vs song musical notes
  isChaotic: boolean;            // Whether current input is chaotic
  lastAnalysisTimestamp: number; // Timestamp of last analysis
  harmonicTrend: number;         // Trend direction of harmony (-1 to 1)
}

/**
 * Externalized game configuration for all configurable values
 * MANDATORY: No hardcoded values allowed in services
 */
export interface IGameSettings {
  difficultyVolume: number;       // Base difficulty volume (0-1, default 0.8)
  qualiaCollectionWindow: number; // Maximum collection window in seconds (default 1.0)
  tempoAcceleration: {
    comboThreshold: number;       // Combo needed to trigger tempo increase
    multiplierIncrement: number;  // How much to increase tempo per threshold
    maxMultiplier: number;        // Maximum tempo multiplier
  };
  ultimateAbility: {
    chargeRequired: number;       // Combo required for ultimate (default 40)
    duration: number;             // Ultimate duration in seconds
    qualiaMultiplier: number;     // Qualia generation multiplier during ultimate
  };
  harmonySystem: {
    chaoticThreshold: number;     // Below this score = chaotic (0-1)
    harmonicThreshold: number;    // Above this score = harmonic (0-1)
    analysisWindow: number;       // Time window for harmony analysis (seconds)
  };
}
```

### Leaderboard & Competition System

```typescript
/**
 * Leaderboard entry for social media competition
 */
export interface ILeaderboardEntry {
  playerId: string;               // Unique player identifier
  playerName: string;             // Display name
  score: number;                  // Final score achieved
  songId: string;                 // Song played
  timestamp: number;              // When the score was achieved
  maxCombo: number;              // Highest combo reached
  accuracyPercentage: number;    // Overall accuracy percentage
  completionPercentage: number;  // Song completion percentage
  difficultyVolume: number;      // Difficulty level (volume) used
}
```

## Core Data Types (Complete Definitions)

### Basic Types

```typescript
// Geometric types
type Vector2 = { x: number, y: number };
type Vector3 = { x: number, y: number, z: number };
type Color = { r: number, g: number, b: number, a?: number };
type Range = { min: number, max: number };
type ColorRange = { min: Color, max: Color };

// Animation and curves
type Curve = IAnimationCurve | number | Range;
type Gradient = IGradientColor | Color | Color[];
```

### Core Game Entities

```typescript
/**
 * Environmental effects that influence gameplay
 */
export interface IEnvironmentEffect {
  id: string;
  name: string;
  type: 'visual' | 'audio' | 'gameplay';
  duration: number;              // Duration in seconds (-1 = permanent)
  intensity: number;             // Effect intensity (0-1)
  position?: Vector2;            // Position if localized effect
  radius?: number;               // Effect radius if applicable
}

/**
 * Player buffs and debuffs
 */
export interface IBuff {
  id: string;
  name: string;
  description: string;
  duration: number;              // Remaining duration in seconds
  stackCount: number;            // Number of stacks
  effect: {
    type: 'damage' | 'speed' | 'health' | 'qualia' | 'combo';
    modifier: number;            // Multiplier or additive value
  };
}

export interface IDebuff extends IBuff {
  severity: 'minor' | 'major' | 'critical';
}

/**
 * Boss-specific buffs and debuffs
 */
export interface IBossBuff extends IBuff {
  triggeredByPhase?: number;     // Phase that triggered this buff
}

export interface IBossDebuff extends IDebuff {
  appliedByCombo?: string;       // Musical combo that applied this debuff
}

/**
 * General effect system
 */
export interface IEffect {
  id: string;
  name: string;
  type: 'visual' | 'audio' | 'particle' | 'gameplay';
  startTime: number;
  duration: number;
  position: Vector2;
  intensity: number;
  color?: Color;
}

/**
 * Hit event tracking
 */
export interface IHitEvent {
  id: string;
  timestamp: number;
  source: 'player' | 'boss';
  target: 'player' | 'boss';
  damage: number;
  position: Vector2;
  wasBlocked: boolean;
  wasCritical: boolean;
  comboCount: number;            // Combo at time of hit
}

/**
 * Collision detection
 */
export interface IHitbox {
  shape: 'rectangle' | 'circle' | 'polygon';
  position: Vector2;
  size: Vector2;                 // Width/height for rectangle, radius for circle
  vertices?: Vector2[];          // For polygon shapes
  rotation?: number;             // Rotation in radians
}

/**
 * Effect data for abilities and attacks
 */
export interface IEffectData {
  id: string;
  type: 'damage' | 'heal' | 'buff' | 'debuff' | 'visual' | 'audio';
  value: number;
  duration?: number;
  probability?: number;          // Chance to apply (0-1)
  target: 'self' | 'enemy' | 'area';
}

/**
 * Spawn rules for dynamic content
 */
export interface ISpawnRule {
  condition: 'time' | 'health' | 'phase' | 'combo' | 'harmony';
  value: number;                 // Threshold value
  operator: '<' | '>' | '=' | '<=' | '>=';
  weight: number;                // Spawn probability weight
}

/**
 * Movement patterns for entities
 */
export interface IMovementPattern {
  id: string;
  type: 'linear' | 'circular' | 'random' | 'tracking' | 'bezier';
  speed: number;
  waypoints?: Vector2[];
  duration?: number;
  looping: boolean;
}
```

### Audio System Types

```typescript
/**
 * Visual effects system
 */
export interface IVisualEffect {
  id: string;
  name: string;
  type: 'particle' | 'light' | 'shader' | 'sprite';
  duration: number;
  position: Vector2;
  scale: Vector2;
  rotation: number;
  color: Color;
  blendMode: string;
  layer: number;                 // Render layer
}

/**
 * Audio effects and processing
 */
export interface IAudioEffect {
  id: string;
  name: string;
  type: 'reverb' | 'delay' | 'distortion' | 'filter' | 'chorus' | 'echo';
  parameters: { [key: string]: number };
  wetLevel: number;              // Wet/dry mix (0-1)
  bypass: boolean;
}

/**
 * Audio clips and samples
 */
export interface IAudioClip {
  id: string;
  name: string;
  filePath: string;
  duration: number;
  sampleRate: number;
  channels: number;
  bitDepth: number;
  looping: boolean;
  volume: number;
  pitch: number;
}

/**
 * Animation curves for interpolation
 */
export interface IAnimationCurve {
  keys: { time: number; value: number; inTangent?: number; outTangent?: number; }[];
  preWrapMode: 'clamp' | 'loop' | 'pingpong';
  postWrapMode: 'clamp' | 'loop' | 'pingpong';
}

/**
 * Audio parameter automation
 */
export interface IAudioParameter {
  name: string;
  value: number;
  curve?: IAnimationCurve;
  randomRange?: Range;
}

/**
 * Gradient color definitions
 */
export interface IGradientColor {
  colorKeys: { time: number; color: Color; }[];
  alphaKeys: { time: number; alpha: number; }[];
  mode: 'blend' | 'fixed';
}
```

### Boss System Types

```typescript
/**
 * Boss phase definitions
 */
export interface IBossPhase {
  id: string;
  name: string;
  healthThreshold: number;       // Health percentage to trigger (0-1)
  duration?: number;             // Maximum phase duration
  patterns: string[];            // Available pattern IDs for this phase
  musicIntensityModifier: number; // How this phase affects music intensity
  aggressionMultiplier: number;  // Aggression modifier for this phase
  qualiaGenerationRate: number;  // Qualia generation rate modifier
}

/**
 * Victory conditions
 */
export interface IVictoryCondition {
  id: string;
  type: 'boss_defeated' | 'song_completed' | 'score_threshold' | 'time_survived';
  value?: number;                // Threshold value if applicable
  description: string;
}

/**
 * Failure conditions
 */
export interface IFailureCondition {
  id: string;
  type: 'player_defeated' | 'time_expired' | 'too_much_chaos';
  value?: number;                // Threshold value if applicable
  description: string;
}
```

### Particle System Types (Complete Definitions)

```typescript
/**
 * Base module interface for particle systems
 */
interface IModuleBase {
  enabled: boolean;
}

/**
 * Particle emission module
 */
export interface IEmissionModule extends IModuleBase {
  rateOverTime: number;
  rateOverDistance: number;
  bursts: IParticleBurst[];
}

/**
 * Shape emission module
 */
export interface IShapeModule extends IModuleBase {
  shape: 'circle' | 'cone' | 'box' | 'sphere' | 'hemisphere';
  radius: number;
  angle: number;
  randomDirection: boolean;
}

/**
 * Particle burst configuration
 */
export interface IParticleBurst {
  time: number;                  // Time to emit burst
  count: Range;                  // Number of particles to emit
  cycleCount: number;           // Number of times to repeat
  repeatInterval: number;       // Time between repeats
  probability: number;          // Chance to emit (0-1)
}

/**
 * Velocity over lifetime module
 */
export interface IVelocityOverLifetimeModule extends IModuleBase {
  linear: Vector3;
  orbital: Vector3;
  offset: Vector3;
  radial: number;
  speedModifier: IAnimationCurve;
  space: 'local' | 'world';
}

/**
 * Limit velocity over lifetime module
 */
export interface ILimitVelocityOverLifetimeModule extends IModuleBase {
  separateAxes: boolean;
  speed: IAnimationCurve;
  speedX: IAnimationCurve;
  speedY: IAnimationCurve;
  speedZ: IAnimationCurve;
  dampen: number;
}

/**
 * Inherit velocity module
 */
export interface IInheritVelocityModule extends IModuleBase {
  mode: 'initial' | 'current';
  curve: IAnimationCurve;
}

/**
 * Force over lifetime module
 */
export interface IForceOverLifetimeModule extends IModuleBase {
  force: Vector3;
  randomizePerFrame: boolean;
  space: 'local' | 'world';
}

/**
 * Color over lifetime module
 */
export interface IColorOverLifetimeModule extends IModuleBase {
  color: IGradientColor;
}

/**
 * Color by speed module
 */
export interface IColorBySpeedModule extends IModuleBase {
  color: IGradientColor;
  range: Range;
}

/**
 * Size over lifetime module
 */
export interface ISizeOverLifetimeModule extends IModuleBase {
  separateAxes: boolean;
  size: IAnimationCurve;
  sizeX: IAnimationCurve;
  sizeY: IAnimationCurve;
  sizeZ: IAnimationCurve;
}

/**
 * Size by speed module
 */
export interface ISizeBySpeedModule extends IModuleBase {
  separateAxes: boolean;
  size: IAnimationCurve;
  sizeX: IAnimationCurve;
  sizeY: IAnimationCurve;
  sizeZ: IAnimationCurve;
  range: Range;
}

/**
 * Rotation over lifetime module
 */
export interface IRotationOverLifetimeModule extends IModuleBase {
  separateAxes: boolean;
  angularVelocity: IAnimationCurve;
  angularVelocityX: IAnimationCurve;
  angularVelocityY: IAnimationCurve;
  angularVelocityZ: IAnimationCurve;
}

/**
 * Rotation by speed module
 */
export interface IRotationBySpeedModule extends IModuleBase {
  separateAxes: boolean;
  angularVelocity: IAnimationCurve;
  angularVelocityX: IAnimationCurve;
  angularVelocityY: IAnimationCurve;
  angularVelocityZ: IAnimationCurve;
  range: Range;
}

/**
 * External forces module
 */
export interface IExternalForcesModule extends IModuleBase {
  multiplier: number;
  influenceFilter: number;
  influenceMask: number;
}

/**
 * Noise module
 */
export interface INoiseModule extends IModuleBase {
  separateAxes: boolean;
  strength: IAnimationCurve;
  strengthX: IAnimationCurve;
  strengthY: IAnimationCurve;
  strengthZ: IAnimationCurve;
  frequency: number;
  scrollSpeed: Vector3;
  damping: boolean;
  octaveCount: number;
  octaveMultiplier: number;
  octaveScale: number;
  quality: 'low' | 'medium' | 'high';
  remapEnabled: boolean;
  remap: IAnimationCurve;
  remapX: IAnimationCurve;
  remapY: IAnimationCurve;
  remapZ: IAnimationCurve;
  positionAmount: IAnimationCurve;
  rotationAmount: IAnimationCurve;
  sizeAmount: IAnimationCurve;
}

/**
 * Collision module
 */
export interface ICollisionModule extends IModuleBase {
  type: 'planes' | 'world';
  mode: 'callback' | 'kill' | 'ignore';
  dampen: IAnimationCurve;
  bounce: IAnimationCurve;
  lifetimeLoss: IAnimationCurve;
  minKillSpeed: number;
  maxKillSpeed: number;
  radiusScale: number;
  quality: 'low' | 'medium' | 'high';
  voxelSize: number;
  collidesWith: number;
}

/**
 * Triggers module
 */
export interface ITriggersModule extends IModuleBase {
  inside: 'ignore' | 'kill' | 'callback';
  outside: 'ignore' | 'kill' | 'callback';
  enter: 'ignore' | 'kill' | 'callback';
  exit: 'ignore' | 'kill' | 'callback';
  radiusScale: number;
}

/**
 * Sub emitters module
 */
export interface ISubEmittersModule extends IModuleBase {
  birth: ISubEmitter[];
  collision: ISubEmitter[];
  death: ISubEmitter[];
}

/**
 * Sub emitter configuration
 */
export interface ISubEmitter {
  emitter: string;               // Reference to another particle system
  type: 'birth' | 'collision' | 'death';
  properties: 'inherit' | 'nothing';
  emitProbability: number;
  inheritColor: boolean;
  inheritSize: boolean;
  inheritRotation: boolean;
}

/**
 * Texture sheet animation module
 */
export interface ITextureSheetAnimationModule extends IModuleBase {
  mode: 'grid' | 'sprites';
  numTilesX: number;
  numTilesY: number;
  animation: 'wholeSheet' | 'singleRow';
  randomRow: boolean;
  row: number;
  cycles: number;
  frameOverTime: IAnimationCurve;
  startFrame: IAnimationCurve;
  flipU: number;
  flipV: number;
  uvChannelMask: number;
  sprites: string[];
}

/**
 * Lights module
 */
export interface ILightsModule extends IModuleBase {
  ratio: number;
  randomDistribution: boolean;
  light: string;                 // Light prefab reference
  useParticleColor: boolean;
  sizeAffectsRange: boolean;
  alphaAffectsIntensity: boolean;
  rangeMultiplier: number;
  intensityMultiplier: number;
  maxLights: number;
}

/**
 * Trails module
 */
export interface ITrailModule extends IModuleBase {
  mode: 'particles' | 'ribbon';
  ratio: number;
  lifetime: IAnimationCurve;
  minVertexDistance: number;
  textureMode: 'stretch' | 'tile' | 'distributePerSegment' | 'repeatPerSegment';
  worldSpace: boolean;
  dieWithParticles: boolean;
  sizeAffectsWidth: boolean;
  sizeAffectsLifetime: boolean;
  inheritParticleColor: boolean;
  colorOverLifetime: IGradientColor;
  widthOverTrail: IAnimationCurve;
  colorOverTrail: IGradientColor;
  generateLightingData: boolean;
  shadowBias: number;
  material: string;              // Material reference
}

/**
 * Custom data module
 */
export interface ICustomDataModule extends IModuleBase {
  mode: 'vector' | 'color';
  vectorComponentCount: 1 | 2 | 3 | 4;
  vector0: IAnimationCurve;
  vector1: IAnimationCurve;
  vector2: IAnimationCurve;
  vector3: IAnimationCurve;
  color: IGradientColor;
}

/**
 * Collision settings for particles
 */
export interface ICollisionSettings {
  enabled: boolean;
  type: 'planes' | 'world';
  planes: Vector3[];
  bounce: number;
  dampen: number;
  lifetimeLoss: number;
  minKillSpeed: number;
  maxKillSpeed: number;
}
```

## Consideraciones de Rendimiento

1. **Estructuras de Datos Eficientes**: Se utilizan arrays tipados y estructuras de datos optimizadas para el rendimiento.
2. **Pooling de Objetos**: Se implementa pooling para partículas y otros objetos frecuentemente creados/destruidos.
3. **Caché de Cálculos**: Se almacenan en caché los cálculos costosos cuando es posible.
4. **Actualización Diferida**: Algunas actualizaciones se realizan en frames posteriores para distribuir la carga.
5. **Niveles de Detalle (LOD)**: Se reducen los efectos en dispositivos de gama baja.

## Extensibilidad

1. **Sistema de Mods**: Las estructuras están diseñadas para ser fácilmente extensibles por modders.
2. **Componentes Personalizados**: Se pueden agregar nuevos componentes sin modificar el código base.
3. **Formatos de Datos**: Soporte para importar/exportar a JSON para facilitar la creación de contenido.
