//! # Responsibility
//! Defines core game state data structures: QualiaState, PlayerState, BossState, CombatState.
//!
//! ---
//!
//! These structures are the primary contracts for communication between backend
//! and frontend. All fields are serializable via serde for WebSocket transmission.
//! Directly translated from DATA.RUST.md and the TypeScript prototype types.

use serde::{Deserialize, Serialize};
use schemars::JsonSchema;

/// # Responsibility
/// Represents the player's current emotional/musical mastery state.
///
/// ---
///
/// This is the central data structure of Qualia Tempo. All values are normalized
/// to the [0.0, 1.0] range. The state is calculated from player actions and drives
/// the visual/audio rendering in real-time.
///
/// **Source**: TypeScript prototype `QualiaState.d.ts`
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct QualiaState {
    /// Overall energy level (0.0 - 1.0)
    pub intensity: f32,
    
    /// Musical harmony/consonance (0.0 - 1.0)
    pub harmony: f32,
    
    /// Disorder/dissonance level (0.0 - 1.0)
    pub chaos: f32,
    
    /// Temporal precision/flow state (0.0 - 1.0)
    pub kairos: f32,
    
    /// Cumulative transcendence score (unbounded, starts at 0.0)
    pub trascendence: f32,
    
    /// Unix timestamp in milliseconds
    pub timestamp: u64,
}

impl Default for QualiaState {
    fn default() -> Self {
        Self {
            intensity: 0.0,
            harmony: 0.0,
            chaos: 0.0,
            kairos: 0.0,
            trascendence: 0.0,
            timestamp: 0,
        }
    }
}

/// # Responsibility
/// Represents a 2D vector for positions and directions.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
pub struct Vec2 {
    pub x: f32,
    pub y: f32,
}

impl Vec2 {
    #[must_use]
    pub const fn new(x: f32, y: f32) -> Self {
        Self { x, y }
    }
    
    #[must_use]
    pub const fn zero() -> Self {
        Self { x: 0.0, y: 0.0 }
    }
}

impl Default for Vec2 {
    fn default() -> Self {
        Self::zero()
    }
}

/// # Responsibility
/// Represents a single status effect (buff or debuff) affecting an entity.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct StatusEffect {
    pub id: String,
    pub name: String,
    pub effect_type: String,
    /// Duration remaining in milliseconds
    pub duration_remaining: f64,
}

/// # Responsibility
/// Represents the state of the player's dash ability.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct DashAbilityState {
    pub is_ready: bool,
    /// Cooldown remaining in milliseconds
    pub cooldown_remaining: f64,
}

/// # Responsibility
/// Represents the state of the player's parry ability.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct ParryAbilityState {
    pub is_ready: bool,
    /// Cooldown remaining in milliseconds
    pub cooldown_remaining: f64,
}

/// # Responsibility
/// Represents the state of the player's ultimate ability.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct UltimateAbilityState {
    pub is_active: bool,
    /// Charge level (0.0 to 100.0)
    pub charge: f32,
}

/// # Responsibility
/// Groups all player ability states.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct PlayerAbilities {
    pub dash: DashAbilityState,
    pub parry: ParryAbilityState,
    pub ultimate: UltimateAbilityState,
}

/// # Responsibility
/// Represents the complete state of the player entity at a given moment.
///
/// ---
///
/// **Source**: TypeScript prototype `PlayerState.d.ts`
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PlayerState {
    pub position: Vec2,
    pub velocity: Vec2,
    pub health: f32,
    pub max_health: f32,
    pub combo_count: u32,
    pub score: u64,
    pub abilities: PlayerAbilities,
    pub buffs: Vec<StatusEffect>,
    pub debuffs: Vec<StatusEffect>,
}

impl Default for PlayerState {
    fn default() -> Self {
        Self {
            position: Vec2::zero(),
            velocity: Vec2::zero(),
            health: 100.0,
            max_health: 100.0,
            combo_count: 0,
            score: 0,
            abilities: PlayerAbilities::default(),
            buffs: Vec::new(),
            debuffs: Vec::new(),
        }
    }
}

/// # Responsibility
/// Represents the complete state of the boss entity at a given moment.
///
/// ---
///
/// **Source**: TypeScript prototype `BossState.d.ts`
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BossState {
    pub id: String,
    pub name: String,
    pub position: Vec2,
    pub health: f32,
    pub max_health: f32,
    pub phase: u8,
    /// Aggression level (0.0 - 1.0)
    pub current_aggression_level: f32,
    pub buffs: Vec<StatusEffect>,
}

impl Default for BossState {
    fn default() -> Self {
        Self {
            id: String::from("default_boss"),
            name: String::from("Unknown Boss"),
            position: Vec2::zero(),
            health: 1000.0,
            max_health: 1000.0,
            phase: 1,
            current_aggression_level: 0.0,
            buffs: Vec::new(),
        }
    }
}

/// # Responsibility
/// Enumerates the possible high-level game phases.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum GamePhase {
    Idle,
    Intro,
    Playing,
    Paused,
    Victory,
    GameOver,
}

impl Default for GamePhase {
    fn default() -> Self {
        Self::Idle
    }
}

/// # Responsibility
/// Represents the complete unified state of combat at a single point in time.
///
/// ---
///
/// This is the primary structure sent from backend to frontend over WebSocket.
/// It contains all information needed to render a single frame of gameplay.
///
/// **Source**: TypeScript prototype `CombatState.d.ts`
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CombatState {
    pub game_phase: GamePhase,
    pub player: PlayerState,
    pub boss: BossState,
    pub qualia: QualiaState,
    pub current_time_sec: f64,
    pub delta_time_ms: f64,
    pub frame_count: u64,
}

impl Default for CombatState {
    fn default() -> Self {
        Self {
            game_phase: GamePhase::default(),
            player: PlayerState::default(),
            boss: BossState::default(),
            qualia: QualiaState::default(),
            current_time_sec: 0.0,
            delta_time_ms: 16.67, // ~60 FPS
            frame_count: 0,
        }
    }
}
