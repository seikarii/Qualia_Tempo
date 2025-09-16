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
export interface QualiaState {
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
  environmentEffects: EnvironmentEffect[]; // Efectos ambientales activos
}
```

### PlayerState
Representa el estado actual del jugador.

```typescript
export interface PlayerState {
  position: Vector2;       // Posición en el escenario
  health: number;          // Salud actual (0-100)
  maxHealth: number;       // Salud máxima
  abilities: {
    pause: AbilityState;
    fastForward: AbilityState;
    rewind: AbilityState;
    ultimate: AbilityState;
  };
  buffs: Buff[];           // Buffs activos
  debuffs: Debuff[];       // Debuffs activos
  rhythmMultiplier: number; // Multiplicador de ritmo actual
  combo: number;           // Combo actual
  score: number;           // Puntuación actual
  dashCooldown: number;    // Tiempo restante para el siguiente dash
  isInvulnerable: boolean; // Indica si el jugador es invulnerable
}

export interface AbilityState {
  isActive: boolean;      // Si la habilidad está activa
  cooldown: number;       // Tiempo restante de enfriamiento
  duration: number;       // Duración restante si está activa
  level: number;          // Nivel de la habilidad
}
```

### BossState
Representa el estado actual del jefe.

```typescript
export interface BossState {
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
  buffs: BossBuff[];      // Buffs activos
  debuffs: BossDebuff[];  // Debuffs activos
}
```

### CombatState
Estado general del combate.

```typescript
export interface CombatState {
  isActive: boolean;      // Indica si el combate está en curso
  startTime: number;      // Tiempo de inicio del combate
  elapsedTime: number;    // Tiempo transcurrido desde el inicio
  songProgress: number;   // Progreso de la canción (0-1)
  difficulty: number;     // Dificultad actual (0-1)
  intensity: number;      // Intensidad del combate (0-1)
  player: PlayerState;    // Estado del jugador
  boss: BossState;        // Estado del jefe
  qualiaState: QualiaState; // Estado de Qualia actualizado
  activeEffects: Effect[]; // Efectos visuales/auditivos activos
  comboHistory: number[];  // Historial de combos
  hitHistory: HitEvent[];  // Historial de golpes
}
```

## Datos de Combate

### CombatData
Estructura principal para los datos de combate.

```typescript
export interface CombatData {
  id: string;             // Identificador único del combate
  bossId: string;         // ID del jefe
  song: SongData;         // Datos de la canción
  patterns: PatternData[]; // Patrones de ataque
  lyrics: LyricData[];    // Letras sincronizadas
  difficultyCurve: {
    time: number;         // Tiempo en segundos
    value: number;        // Valor de dificultad (0-1)
  }[];
  phases: BossPhase[];    // Fases del jefe
  victoryConditions: VictoryCondition[]; // Condiciones de victoria
  failureConditions: FailureCondition[]; // Condiciones de derrota
}
```

### PatternData
Datos para los patrones de ataque del jefe.

```typescript
export interface PatternData {
  id: string;             // Identificador único del patrón
  name: string;           // Nombre descriptivo
  type: 'projectile' | 'melee' | 'aoe' | 'movement' | 'special';
  difficulty: number;     // Dificultad base (0-1)
  duration: number;       // Duración en segundos
  cooldown: number;       // Tiempo de enfriamiento mínimo
  telegraphTime: number;  // Tiempo de advertencia
  hitbox: Hitbox;         // Zona de daño
  damage: number;         // Daño base
  effects: EffectData[];  // Efectos aplicados al golpear
  audioCue: string;       // Pista de audio para la señal
  visualCue: string;      // Efecto visual para la señal
  spawnRules: SpawnRule[]; // Reglas de aparición
  movementPattern: MovementPattern; // Patrón de movimiento
  phase: number;          // Fase en la que aparece (0 = todas)
  weight: number;         // Peso para selección aleatoria
}
```

### LyricData
Datos para las letras sincronizadas.

```typescript
export interface LyricData {
  id: string;             // Identificador único
  text: string;           // Texto de la letra
  startTime: number;      // Tiempo de inicio en segundos
  endTime: number;        // Tiempo de fin en segundos
  emotion: string;        // Emoción asociada
  intensity: number;      // Intensidad (0-1)
  triggers: string[];     // Eventos que dispara
  visualEffects: VisualEffect[]; // Efectos visuales asociados
  audioEffects: AudioEffect[];   // Efectos de audio asociados
}
```

## Sistema de Partículas

### ParticleSystemConfig
Configuración del sistema de partículas.

```typescript
export interface ParticleSystemConfig {
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
export interface ParticleEffect {
  id: string;             // Identificador único
  name: string;           // Nombre descriptivo
  system: ParticleSystemConfig; // Configuración del sistema
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
export interface AudioEvent {
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
export interface AudioLayer {
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
  customRolloff: AnimationCurve; // Curva de atenuación personalizada
  reverbZoneMix: number;  // Mezcla de zona de reverberación
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

## Tipos de Datos Compartidos

```typescript
// Tipos de datos básicos
type Vector2 = { x: number, y: number };
type Vector3 = { x: number, y: number, z: number };
type Color = { r: number, g: number, b: number, a?: number };
type Range = { min: number, max: number };
type ColorRange = { min: Color, max: Color };

// Tipos para curvas y gradientes
type Curve = AnimationCurve | number | Range;
type Gradient = GradientColor | Color | Color[];

// Estructuras para módulos de partículas
interface ModuleBase { enabled: boolean; }
interface EmissionModule extends ModuleBase { /* ... */ }
interface ShapeModule extends ModuleBase { /* ... */ }
// ... otros módulos de partículas
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
