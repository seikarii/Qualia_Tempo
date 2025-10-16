//! # Responsibility
//! Defines game state structures for real-time gameplay state synchronization.

use serde::{Deserialize, Serialize};
use schemars::JsonSchema;
use crate::utils::Vector3;

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

/// # Responsibility
/// Represents a single status effect (buff or debuff).
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct StatusEffect {
    /// Unique identifier for the effect
    pub id: String,
    /// Human-readable name
    pub name: String,
    /// Time remaining in milliseconds
    pub duration_remaining: f64,
}

/// # Responsibility
/// Represents the state of a player's dash ability.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct DashAbilityState {
    /// Whether the dash is ready to use
    pub is_ready: bool,
    /// Cooldown remaining in milliseconds
    pub cooldown_remaining: f64,
}

/// # Responsibility
/// Represents the state of a player's parry ability.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct ParryAbilityState {
    /// Whether the parry is ready to use
    pub is_ready: bool,
    /// Cooldown remaining in milliseconds
    pub cooldown_remaining: f64,
}

/// # Responsibility
/// Represents the state of a player's ultimate ability.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct UltimateAbilityState {
    /// Whether ultimate is currently active
    pub is_active: bool,
    /// Charge level (0.0 to 100.0)
    pub charge: f32,
}

/// # Responsibility
/// Groups the state of all player abilities.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct PlayerAbilities {
    /// Dash ability state
    pub dash: DashAbilityState,
    /// Parry ability state
    pub parry: ParryAbilityState,
    /// Ultimate ability state
    pub ultimate: UltimateAbilityState,
}

/// # Responsibility
/// Represents the complete state of the player entity in 3D space.
///
/// ---
///
/// CRITICAL: Uses Vector3 for positions and velocities to support
/// the deferred rendering pipeline with proper depth information.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PlayerState {
    /// Player position in 3D world space
    pub position: Vector3,
    /// Player velocity vector
    pub velocity: Vector3,
    /// Health points (0-100)
    pub health: f32,
    /// Current combo multiplier
    pub combo: u32,
    /// Total score
    pub score: u64,
    /// Whether player is currently moving
    pub is_moving: bool,
    /// Timestamp of last rhythm hit (JavaScript timestamp)
    pub last_rhythm_hit: f64,
    /// Player abilities state
    pub abilities: PlayerAbilities,
    /// Active buffs
    pub buffs: Vec<StatusEffect>,
    /// Active debuffs
    pub debuffs: Vec<StatusEffect>,
}

impl Default for PlayerState {
    fn default() -> Self {
        Self {
            position: Vector3::zero(),
            velocity: Vector3::zero(),
            health: 100.0,
            combo: 0,
            score: 0,
            is_moving: false,
            last_rhythm_hit: 0.0,
            abilities: PlayerAbilities::default(),
            buffs: Vec::new(),
            debuffs: Vec::new(),
        }
    }
}

/// # Responsibility
/// Represents the complete state of the boss entity in 3D space.
///
/// ---
///
/// CRITICAL: Uses Vector3 for position to support procedural SDF rendering
/// with raymarching in the deferred rendering pipeline.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BossState {
    /// Boss unique identifier
    pub id: String,
    /// Boss name
    pub name: String,
    /// Boss position in 3D world space
    pub position: Vector3,
    /// Current health points (0-100)
    pub health: f32,
    /// Maximum health points
    pub max_health: f32,
    /// Current phase number
    pub current_phase: u32,
    /// IDs of currently active attack patterns
    pub active_patterns: Vec<String>,
    /// IDs of active buffs
    pub buffs: Vec<String>,
    /// IDs of active debuffs
    pub debuffs: Vec<String>,
    /// Current aggression level (0-1)
    pub current_aggression_level: f32,
}

impl Default for BossState {
    fn default() -> Self {
        Self {
            id: String::from("default_boss"),
            name: String::from("Unknown"),
            position: Vector3::zero(),
            health: 100.0,
            max_health: 100.0,
            current_phase: 0,
            active_patterns: Vec::new(),
            buffs: Vec::new(),
            debuffs: Vec::new(),
            current_aggression_level: 0.0,
        }
    }
}

/// # Responsibility
/// Enumerates the possible high-level states of the game.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum GameStatus {
    /// Game is idle (menu)
    Idle,
    /// Game is actively playing
    Playing,
    /// Game is paused
    Paused,
    /// Game is over
    GameOver,
}

/// # Responsibility
/// Represents a Qualia event for history/replay purposes.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct QualiaEvent {
    /// Event unique identifier
    pub id: String,
    /// Timestamp of event
    pub timestamp: f64,
    /// Position where event occurred in 3D space
    pub position: Vector3,
    /// Qualia value generated
    pub value: f32,
}

/// # Responsibility
/// Represents the complete, unified state of the combat at a single point in time.
/// This is the primary data structure sent from backend to frontend.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CombatState {
    /// Current game status
    pub game_state: GameStatus,
    /// Whether combat is active
    pub is_active: bool,
    /// Current phase number
    pub current_phase: u32,
    /// Elapsed time in seconds
    pub elapsed_time: f64,
    /// Song progress (0-1)
    pub song_progress: f32,
    /// Player state
    pub player: PlayerState,
    /// Boss state
    pub boss: BossState,
    /// Current qualia state
    pub qualia_state: QualiaState,
    /// IDs of active visual effects
    pub active_effects: Vec<String>,
    /// IDs of active environmental effects
    pub environment_effects: Vec<String>,
    /// History of qualia events
    pub qualia_event_history: Vec<QualiaEvent>,
}

impl Default for CombatState {
    fn default() -> Self {
        Self {
            game_state: GameStatus::Idle,
            is_active: false,
            current_phase: 0,
            elapsed_time: 0.0,
            song_progress: 0.0,
            player: PlayerState::default(),
            boss: BossState::default(),
            qualia_state: QualiaState::default(),
            active_effects: Vec::new(),
            environment_effects: Vec::new(),
            qualia_event_history: Vec::new(),
        }
    }
}
