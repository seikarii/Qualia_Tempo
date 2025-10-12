# DATA.RUST.md - Catálogo de Contratos de Datos
# TARGET: Qualia Tempo Rust Rewrite
# COMPLIANCE: data_structures_v2.md + QUALIA.CODE.RUST v1.1

---

## Introducción

Este documento es la fuente de verdad para la implementación de las estructuras de datos (`structs` y `enums`) en Rust. Cada estructura aquí es una traducción directa y de alta fidelidad de los contratos definidos en `data_structures_v2.md` y los archivos de tipos del prototipo.

---

## 1. Estructuras de Estado del Juego

### 1.1. QualiaState

*   **Fuente Original:** `qualia-tempo-prototype/frontend/src/types/QualiaState.d.ts`
*   **Propósito:** Representa el estado de maestría del jugador en tiempo real.

```rust
use serde::{Deserialize, Serialize};
use schemars::JsonSchema;

/// # Responsibility
/// Central data structure representing player mastery in Qualia Tempo.
///
/// ---
///
/// Directly translated from the prototype's `QualiaState.d.ts`. This is the
/// authoritative data structure for player performance and drives visuals/audio.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct QualiaState {
    /// Overall energy level (0-1)
    pub intensity: f32,
    /// Accuracy streaks (0-1)
    pub precision: f32,
    /// Fast Forward usage (0-1)
    pub aggression: f32,
    /// Rhythmic consistency (0-1)
    pub flow: f32,
    /// Rhythm failures (0-1)
    pub chaos: f32,
    /// Rewind usage (0-1)
    pub recovery: f32,
    /// Ultimate mode (0-1)
    pub transcendence: f32,
    /// Timestamp marking end of current Qualia collection window (max 1 second).
    /// Using f64 for compatibility with JavaScript's floating-point timestamps.
    pub collection_window_end: f64,
}
```

### 1.2. PlayerState

*   **Fuente Original:** `qualia-tempo-prototype/frontend/src/types/PlayerState.d.ts`
*   **Propósito:** Representa el estado completo del jugador en un momento dado.

```rust
// Nota: Se asume la existencia de un tipo Vector2 en `utils::math`

/// # Responsibility
/// Represents a single status effect (buff or debuff).
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct StatusEffect {
    pub id: String,
    pub name: String,
    pub duration_remaining: f64, // ms
}

/// # Responsibility
/// Represents the state of a player's dash ability.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct DashAbilityState {
    pub is_ready: bool,
    pub cooldown_remaining: f64, // ms
}

/// # Responsibility
/// Represents the state of a player's parry ability.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct ParryAbilityState {
    pub is_ready: bool,
    pub cooldown_remaining: f64, // ms
}

/// # Responsibility
/// Represents the state of a player's ultimate ability.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct UltimateAbilityState {
    pub is_active: bool,
    pub charge: f32, // 0.0 to 100.0
}

/// # Responsibility
/// Groups the state of all player abilities.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct PlayerAbilities {
    pub dash: DashAbilityState,
    pub parry: ParryAbilityState,
    pub ultimate: UltimateAbilityState,
}

/// # Responsibility
/// Represents the complete state of the player entity.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PlayerState {
    pub position: Vector2,
    pub velocity: Vector2,
    pub health: f32, // 0-100
    pub combo: u32,
    pub score: u64,
    pub is_moving: bool,
    pub last_rhythm_hit: f64, // JS Timestamp
    pub abilities: PlayerAbilities,
    pub buffs: Vec<StatusEffect>,
    pub debuffs: Vec<StatusEffect>,
}
```

### 1.3. BossState

*   **Fuente Original:** `qualia-tempo-prototype/frontend/src/types/BossState.d.ts`
*   **Propósito:** Representa el estado completo del jefe en un momento dado.

```rust
/// # Responsibility
/// Represents the complete state of the boss entity.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BossState {
    pub id: String,
    pub name: String,
    pub position: Vector2,
    pub health: f32, // 0-100
    pub max_health: f32,
    pub current_phase: u32,
    pub active_patterns: Vec<String>,
    pub buffs: Vec<String>, // IDs of active buffs
    pub debuffs: Vec<String>, // IDs of active debuffs
    pub current_aggression_level: f32, // 0-1
}
```

### 1.4. CombatState

*   **Fuente Original:** `qualia-tempo-prototype/frontend/src/types/CombatState.d.ts`
*   **Propósito:** Agrega todos los estados relevantes para representar un único frame de combate.

```rust
/// # Responsibility
/// Enumerates the possible high-level states of the game.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum GameStatus {
    Idle,
    Playing,
    Paused,
    GameOver,
}

/// # Responsibility
/// Represents a Qualia event for history/replay purposes.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct QualiaEvent {
    pub id: String,
    pub timestamp: f64,
    pub position: Vector2,
    pub value: f32,
}

/// # Responsibility
/// Represents the complete, unified state of the combat at a single point in time.
/// This is the primary data structure sent from backend to frontend.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CombatState {
    pub game_state: GameStatus,
    pub is_active: bool,
    pub current_phase: u32,
    pub elapsed_time: f64, // seconds
    pub song_progress: f32, // 0-1
    pub player: PlayerState, // Using the full PlayerState definition
    pub boss: BossState, // Using the full BossState definition
    pub active_effects: Vec<String>, // IDs of active visual effects
    pub environment_effects: Vec<String>, // IDs of active environmental effects
    pub qualia_event_history: Vec<QualiaEvent>,
}
```

---

## 2. Estructuras de Datos de Combate

Estas estructuras definen el contenido de una batalla. Se cargan al inicio desde archivos de configuración (ej. JSON, RON) y son usadas por el backend para orquestar la pelea.

### 2.1. SongData

*   **Fuente Original:** `qualia-tempo-prototype/frontend/src/types/ISongData.d.ts`
*   **Propósito:** Define la estructura musical y rítmica de una canción.

```rust
/// # Responsibility
/// Defines the musical time signature.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TimeSignature {
    pub numerator: u8,
    pub denominator: u8,
}

/// # Responsibility
/// Defines a structural section of a song (e.g., verse, chorus).
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SongSection {
    pub name: String, // e.g., "intro", "verse", "chorus"
    pub start_time_sec: f64,
    pub end_time_sec: f64,
}

/// # Responsibility
/// Defines a single beat in the song's timeline.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BeatData {
    pub timestamp: f64, // seconds
    pub beat_number: u32,
    pub bar_number: u32,
    pub is_downbeat: bool,
}

/// # Responsibility
/// Defines the difficulty tier of a song.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum SongDifficulty {
    Easy,
    Medium,
    Hard,
    Expert,
}

/// # Responsibility
/// Contains all metadata and structural information for a song.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SongData {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub bpm: f32,
    pub duration_sec: f64,
    pub audio_file_path: String,
    pub time_signature: TimeSignature,
    pub key: Option<String>,
    pub sections: Vec<SongSection>,
    pub beat_map: Vec<BeatData>,
    pub difficulty: SongDifficulty,
    pub preview_start_sec: Option<f64>,
}
```

### 2.2. MusicalComboData

*   **Fuente Original:** `qualia-tempo-prototype/frontend/src/types/MusicalComboData.d.ts`
*   **Propósito:** Define una secuencia de acciones que resulta en un combo musical.

```rust
/// # Responsibility
/// Defines a single action within a combo sequence.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ComboActionType {
    Hit,
    Dash,
    Parry,
    Sustain,
}

/// # Responsibility
/// Defines the timing requirement for a combo action.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ComboTiming {
    Exact,
    Early,
    Late,
    Any,
}

/// # Responsibility
/// Defines a step in a combo sequence.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ComboStep {
    pub action: ComboActionType,
    pub timing: ComboTiming,
    pub max_delay_ms: Option<u32>,
}

/// # Responsibility
/// Defines a musical combo and its effects.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MusicalComboData {
    pub id: String,
    pub name: String,
    pub sequence: Vec<ComboStep>,
    pub bonus_multiplier: f32,
    pub qualia_modifiers: QualiaState, // Partial QualiaState used as modifier
    pub visual_effect_id: Option<String>,
    pub audio_effect_id: Option<String>,
    pub difficulty: SongDifficulty,
}
```

### 2.3. PatternData

*   **Fuente Original:** `qualia-tempo-prototype/frontend/src/types/PatternData.d.ts`
*   **Propósito:** Define un patrón de ataque del jefe.

```rust
/// # Responsibility
/// Defines the type of a boss attack pattern.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum PatternType {
    Projectile,
    Area,
    Melee,
    Summon,
    Buff,
}

/// # Responsibility
/// Defines a single note or projectile within a boss attack pattern.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PatternNote {
    pub timestamp: f64, // seconds from pattern start
    pub position: Vector2,
    pub velocity: Option<Vector2>,
    pub damage: f32,
    pub visual_data: Option<PatternNoteVisuals>,
}

/// # Responsibility
/// Defines the visual properties of a pattern note.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PatternNoteVisuals {
    pub color: Option<String>,
    pub size: Option<f32>,
    pub shape: Option<String>,
}

/// # Responsibility
/// Defines the thresholds required to trigger a pattern.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct QualiaThreshold {
    pub aggression: Option<f32>,
    pub chaos: Option<f32>,
}

/// # Responsibility
/// Defines a complete boss attack pattern.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PatternData {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub pattern_type: PatternType,
    pub phases: Vec<u32>,
    pub notes: Vec<PatternNote>,
    pub duration_sec: f64,
    pub cooldown_sec: f64,
    pub required_qualia_threshold: Option<QualiaThreshold>,
}
```

---

## 3. Estructuras de Configuración y Metajuego

### 3.1. GameSettings

*   **Fuente Original:** `qualia-tempo-prototype/frontend/src/types/IGameSettings.d.ts`
*   **Propósito:** Define todas las configuraciones del juego que el usuario puede modificar.

```rust
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AudioSettings {
    pub master_volume: f32,
    pub music_volume: f32,
    pub sfx_volume: f32,
    pub audio_offset_ms: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TimingWindowSettings {
    pub perfect: u32, // ms
    pub good: u32,
    pub ok: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct GameplaySettings {
    pub timing_window_ms: TimingWindowSettings,
    pub autoplay: bool,
    pub practice_mode: bool,
    pub show_timing: bool,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ParticleDensity {
    Low,
    Medium,
    High,
    Ultra,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct VisualSettings {
    pub brightness: f32,
    pub particle_density: ParticleDensity,
    pub post_processing_enabled: bool,
    pub bloom_intensity: f32,
    pub show_hit_effects: bool,
    pub show_combo_text: bool,
    pub background_animations: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct InputSettings {
    pub key_bindings: std::collections::HashMap<String, Vec<String>>,
    pub mouse_sensitivity: f32,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ColorblindMode {
    None,
    Protanopia,
    Deuteranopia,
    Tritanopia,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AccessibilitySettings {
    pub colorblind_mode: ColorblindMode,
    pub screen_shake_intensity: f32,
    pub flashing_effects: bool,
    pub subtitles_enabled: bool,
}

/// # Responsibility
/// Agrega todas las configuraciones del juego en una única estructura.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct GameSettings {
    pub audio: AudioSettings,
    pub gameplay: GameplaySettings,
    pub visual: VisualSettings,
    pub input: InputSettings,
    pub accessibility: AccessibilitySettings,
}
```

### 3.2. LeaderboardEntry

*   **Fuente Original:** `qualia-tempo-prototype/frontend/src/types/ILeaderboardEntry.d.ts`
*   **Propósito:** Define la estructura de una entrada en la tabla de clasificación.

```rust
/// # Responsibility
/// Defines the structure for a single leaderboard entry.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LeaderboardEntry {
    pub rank: u32,
    pub player_id: String,
    pub player_name: String,
    pub score: u64,
    pub song_id: String,
    pub difficulty: SongDifficulty,
    pub max_combo: u32,
    pub accuracy: f32, // 0-1
    pub timestamp: i64, // Unix timestamp
    pub qualia_snapshot: QualiaState, // Partial QualiaState
    pub replay_data_url: Option<String>,
}
```

### 3.3. Efectos Activos y de Entorno

*   **Fuentes Originales:** `IActiveEffect.d.ts`, `IEnvironmentEffect.d.ts`
*   **Propósito:** Definen efectos visuales y de gameplay que existen en el mundo del juego.

```rust
// Nota: Se asume la existencia de un tipo Vector3 en `utils::math`

#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ActiveEffectType {
    ParticleBurst, Trail, Aura, ScreenShake, ColorShift, Distortion, BloomPulse, GodRays, ReactionDiffusion, SdfMorph
}

/// # Responsibility
/// Represents an active, instantiated visual effect in the world.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ActiveEffect {
    pub id: String,
    pub effect_type: ActiveEffectType,
    pub start_time: f64,
    pub duration_sec: f64,
    pub position: Vector3,
    pub intensity: f32,
    pub color: [f32; 4], // RGBA
    pub scale: f32,
    pub fade_in_sec: Option<f64>,
    pub fade_out_sec: Option<f64>,
    pub attached_to_entity: Option<String>,
    pub custom_parameters: Option<std::collections::HashMap<String, f32>>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum EnvironmentEffectType {
    GravityShift, TimeDilation, ColorFilter, AmbientParticles, LightingChange, Fog, Wind, Barrier
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AffectedAreaShape { Circle, Rectangle, Global }

#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AffectedArea {
    pub shape: AffectedAreaShape,
    pub center: Option<Vector2>,
    pub radius: Option<f32>,
    pub width: Option<f32>,
    pub height: Option<f32>,
}

/// # Responsibility
/// Represents an environmental effect that modifies the gameplay area.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct EnvironmentEffect {
    pub id: String,
    #[serde(rename = "type")]
    pub effect_type: EnvironmentEffectType,
    pub start_time: f64,
    pub duration_sec: f64,
    pub affected_area: AffectedArea,
    pub intensity: f32,
    pub gameplay_modifiers: Option<std::collections::HashMap<String, f32>>,
    pub visual_parameters: Option<std::collections::HashMap<String, f32>>,
    pub triggered_by_qualia_state: Option<QualiaThreshold>,
}
```

### 3.4. Análisis de Input Musical

*   **Fuente Original:** `qualia-tempo-prototype/frontend/src/types/IMusicalInputAnalysis.d.ts`
*   **Propósito:** Define la estructura para el análisis de la calidad musical del input del jugador.

```rust
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum RhythmicPattern {
    None, Steady, Syncopated, Polyrhythmic, Chaotic
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum InputAccuracy { Perfect, Good, Ok, Miss }

#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RecentInput {
    pub action: ComboActionType,
    pub timestamp: f64,
    pub timing_offset: f64, // ms
    pub accuracy: InputAccuracy,
}

/// # Responsibility
/// Contains the analysis of the player's input from a musical perspective.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MusicalInputAnalysis {
    pub timestamp: f64,
    pub recent_inputs: Vec<RecentInput>,
    pub rhythmic_consistency: f32, // 0-1
    pub detected_pattern: RhythmicPattern,
    pub harmonic_alignment: f32, // 0-1
    pub phrase_completion: f32, // 0-1
    pub dynamic_range: f32, // 0-1
    pub suggested_qualia_shift: QualiaState, // Partial QualiaState
}
```

---

## 4. Estructuras del Sistema de Audio (Frontend)

**NOTA ARQUITECTÓNICA:** Estas estructuras son para la configuración interna del motor de audio del frontend y no se sincronizan por la red.

### 4.1. AudioEvent

*   **Fuente Original:** `qualia-tempo-prototype/frontend/src/types/AudioEvent.d.ts`
*   **Propósito:** Define un evento para ser procesado por el `AudioEngineService`.

```rust
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AudioEventType {
    PlaySfx, StopSfx, PlayMusic, StopMusic, Crossfade, VolumeChange, PitchShift, ApplyFilter, TriggerStinger, SyncBeat
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum FilterType { Lowpass, Highpass, Bandpass, Reverb, Delay, Distortion }

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AudioEventParameters {
    pub volume: Option<f32>,
    pub pitch: Option<f32>,
    pub pan: Option<f32>,
    pub fade_in_sec: Option<f64>,
    pub fade_out_sec: Option<f64>,
    pub loop_playback: Option<bool>,
    pub priority: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AudioFilterSettings {
    #[serde(rename = "type")]
    pub filter_type: Option<FilterType>,
    pub frequency: Option<f32>,
    pub resonance: Option<f32>,
    pub wet_dry_mix: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SpatialData {
    pub position: Option<Vector3>,
    pub max_distance: Option<f32>,
    pub rolloff_factor: Option<f32>,
}

/// # Responsibility
/// Defines a command for the audio engine to execute.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AudioEvent {
    pub id: String,
    #[serde(rename = "type")]
    pub event_type: AudioEventType,
    pub timestamp: f64,
    pub audio_clip_id: Option<String>,
    pub layer_id: Option<String>,
    pub parameters: Option<AudioEventParameters>,
    pub filter_settings: Option<AudioFilterSettings>,
    pub spatial_data: Option<SpatialData>,
    pub trigger_condition: Option<QualiaThreshold>,
}
```

### 4.2. AudioLayer

*   **Fuente Original:** `qualia-tempo-prototype/frontend/src/types/AudioLayer.d.ts`
*   **Propósito:** Define una capa de mezcla en el motor de audio.

```rust
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AudioLayerType { Music, Sfx, Ambient, Voice, Ui }

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ActiveAudioSource {
    pub source_id: String,
    pub audio_clip_id: String,
    pub start_time: f64,
    pub volume: f32,
    pub is_looping: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LayerEffect {
    pub effect_id: String,
    #[serde(rename = "type")]
    pub effect_type: String, // e.g., "compressor", "eq"
    pub enabled: bool,
    pub parameters: Option<std::collections::HashMap<String, f32>>,
}

/// # Responsibility
/// Defines a mixing layer for grouping and applying effects to audio sources.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AudioLayer {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub layer_type: AudioLayerType,
    pub volume: f32,
    pub muted: bool,
    pub solo: bool,
    pub active_sources: Vec<ActiveAudioSource>,
    pub effects: Vec<LayerEffect>,
    pub qualia_modulation: Option<std::collections::HashMap<String, bool>>,
}
```

---

## 5. Configuración del Sistema de Partículas (Frontend)

**NOTA ARQUITECTÓNICA:** Estas estructuras son para la configuración interna del motor de partículas del frontend (`wgpu`) y no se sincronizan por la red.

```rust
// Esta sección es una traducción directa de la compleja interfaz IParticleSystemConfig
// y sus sub-módulos de `data_structures_v2.md`. Por su gran tamaño y especificidad
// al motor de render, se omite la definición completa aquí, pero se implementará
// fielmente en `frontend/src/rendering/effects/particle_config.rs`.

/// # Responsibility
/// Top-level configuration for a complete particle system effect.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
pub struct ParticleSystemConfig {
    // ... Campos como max_particles, emission, shape, etc. ...
    // ... que contienen structs como EmissionModule, ShapeModule, etc. ...
}
```

---

## 6. Estructuras de Escena y Cinemáticas

Estas estructuras definen el flujo entre diferentes partes del juego (menús, cinemáticas, gameplay) y el contenido de las secuencias narrativas.

### 6.1. SceneData

*   **Propósito:** Define la configuración de una escena cargable.

```rust
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum SceneType {
    Menu,
    Combat,
    Cinematic,
    ScoreScreen,
}

/// # Responsibility
/// Defines the data required to load and initialize a game scene.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SceneData {
    pub id: String,
    pub scene_type: SceneType,
    /// Path to specific data for this scene (e.g., path to a CombatData JSON file).
    pub data_path: String,
    /// ID of the next scene to transition to automatically, if any.
    pub next_scene_id: Option<String>,
}
```

### 6.2. CinematicData

*   **Propósito:** Define una secuencia de eventos para una cinemática.

```rust
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum CinematicEventType {
    ShowSubtitle,
    HideSubtitle,
    CameraMove,
    PlayAudio,
    WaitForInput,
    TriggerGameEvent,
    EndCinematic,
}

/// # Responsibility
/// Defines a single event within a cinematic timeline.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CinematicEvent {
    pub timestamp_ms: u64,
    pub event_type: CinematicEventType,
    /// JSON-encoded payload for the event (e.g., subtitle text, camera coordinates).
    pub payload: Option<serde_json::Value>,
}

/// # Responsibility
/// Defines a complete cinematic sequence.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CinematicData {
    pub id: String,
    pub events: Vec<CinematicEvent>,
}
``````
