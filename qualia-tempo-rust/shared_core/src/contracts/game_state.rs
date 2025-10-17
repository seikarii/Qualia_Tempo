//! # Responsibility
//! Contains all core game state data structures for Qualia Tempo.
//!
//! ---
//!
//! This module defines the authoritative state types that represent the complete
//! game state at any given moment. These types are serialized over WebSocket
//! connections between backend and frontend. All structs are directly translated
//! from the TypeScript prototype with high fidelity.
//!
//! ## Key Types
//! - `QualiaState`: Player's emotional/musical mastery state
//! - `PlayerState`: Complete player entity state
//! - `BossState`: Complete boss entity state
//! - `CombatState`: Unified game state snapshot
//!
//! All types use `#[serde(rename_all = "camelCase")]` for JavaScript interop.

use serde::{Deserialize, Serialize};
use schemars::JsonSchema;
use crate::utils::math::Vec2;

/// # Responsibility
/// Central data structure representing player mastery in Qualia Tempo.
///
/// ---
///
/// Directly translated from the prototype's `QualiaState.d.ts`. This is the
/// authoritative data structure for player performance and drives visuals/audio.
/// All values are normalized to [0.0, 1.0] range except `collection_window_end`.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct QualiaState {
    /// Overall energy level (0.0 - 1.0)
    pub intensity: f32,
    
    /// Accuracy streaks (0.0 - 1.0)
    pub precision: f32,
    
    /// Fast Forward usage (0.0 - 1.0)
    pub aggression: f32,
    
    /// Rhythmic consistency (0.0 - 1.0)
    pub flow: f32,
    
    /// Rhythm failures (0.0 - 1.0)
    pub chaos: f32,
    
    /// Rewind usage (0.0 - 1.0)
    pub recovery: f32,
    
    /// Ultimate mode (0.0 - 1.0)
    pub transcendence: f32,
    
    /// Timestamp marking end of current Qualia collection window (max 1 second).
    /// Using f64 for compatibility with JavaScript's floating-point timestamps.
    pub collection_window_end: f64,
}

impl Default for QualiaState {
    fn default() -> Self {
        Self {
            intensity: 0.0,
            precision: 0.0,
            aggression: 0.0,
            flow: 0.0,
            chaos: 0.0,
            recovery: 0.0,
            transcendence: 0.0,
            collection_window_end: 0.0,
        }
    }
}

/// # Responsibility
/// Represents a single status effect (buff or debuff).
///
/// ---
///
/// Used for both player and boss status effects. The `duration_remaining`
/// is in milliseconds and counts down to zero.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct StatusEffect {
    /// Unique identifier for this effect instance
    pub id: String,
    
    /// Human-readable name (e.g., "Speed Boost", "Weakened")
    pub name: String,
    
    /// Remaining duration in milliseconds
    pub duration_remaining: f64,
}

/// # Responsibility
/// Represents the state of a player's dash ability.
///
/// ---
///
/// The dash ability recharges on each metronome tick. `cooldown_remaining`
/// is in milliseconds.
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
///
/// ---
///
/// Parry has a cooldown that can be reduced by musical accuracy.
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
///
/// ---
///
/// Ultimate charges from combo milestones and activates at combo x40.
/// While active, doubles Qualia generation and triggers visual/audio effects.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct UltimateAbilityState {
    /// Whether the ultimate is currently active
    pub is_active: bool,
    
    /// Charge level (0.0 to 100.0)
    pub charge: f32,
}

/// # Responsibility
/// Groups the state of all player abilities.
///
/// ---
///
/// This struct aggregates all ability states for clean serialization.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct PlayerAbilities {
    pub dash: DashAbilityState,
    pub parry: ParryAbilityState,
    pub ultimate: UltimateAbilityState,
}

/// # Responsibility
/// Represents the complete state of the player entity.
///
/// ---
///
/// This is the authoritative player state sent from backend to frontend.
/// Includes position, health, combo, score, abilities, and status effects.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PlayerState {
    /// Current position in the arena
    pub position: Vec2,
    
    /// Current velocity vector
    pub velocity: Vec2,
    
    /// Health (0.0 to 100.0)
    pub health: f32,
    
    /// Current combo count
    pub combo: u32,
    
    /// Current score
    pub score: u64,
    
    /// Whether the player is moving
    pub is_moving: bool,
    
    /// Timestamp of the last rhythmic hit (JavaScript timestamp)
    pub last_rhythm_hit: f64,
    
    /// All ability states
    pub abilities: PlayerAbilities,
    
    /// Active buffs
    pub buffs: Vec<StatusEffect>,
    
    /// Active debuffs
    pub debuffs: Vec<StatusEffect>,
}

impl Default for PlayerState {
    fn default() -> Self {
        Self {
            position: Vec2::new(0.0, 0.0),
            velocity: Vec2::new(0.0, 0.0),
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
/// Represents the complete state of the boss entity.
///
/// ---
///
/// The boss's health represents the remaining song duration. Phases change
/// based on health thresholds, triggering different attack patterns.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BossState {
    /// Unique identifier for this boss
    pub id: String,
    
    /// Boss name (e.g., "The Conductor")
    pub name: String,
    
    /// Current position in the arena
    pub position: Vec2,
    
    /// Current health (0.0 to max_health)
    pub health: f32,
    
    /// Maximum health
    pub max_health: f32,
    
    /// Current phase number (1, 2, 3, etc.)
    pub current_phase: u32,
    
    /// IDs of currently active attack patterns
    pub active_patterns: Vec<String>,
    
    /// IDs of active buffs
    pub buffs: Vec<String>,
    
    /// IDs of active debuffs
    pub debuffs: Vec<String>,
    
    /// Current aggression level (0.0 to 1.0)
    /// Increases with player combo, reducing attack telegraphs
    pub current_aggression_level: f32,
}

impl Default for BossState {
    fn default() -> Self {
        Self {
            id: String::from("default_boss"),
            name: String::from("Boss"),
            position: Vec2::new(0.0, 0.0),
            health: 100.0,
            max_health: 100.0,
            current_phase: 1,
            active_patterns: Vec::new(),
            buffs: Vec::new(),
            debuffs: Vec::new(),
            current_aggression_level: 0.0,
        }
    }
}

/// # Responsibility
/// Enumerates the possible high-level states of the game.
///
/// ---
///
/// Used to control game flow and UI state transitions.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum GameStatus {
    /// Game is idle, waiting to start
    Idle,
    
    /// Game is actively playing
    Playing,
    
    /// Game is paused
    Paused,
    
    /// Game has ended (victory or defeat)
    GameOver,
}

impl Default for GameStatus {
    fn default() -> Self {
        Self::Idle
    }
}

/// # Responsibility
/// Represents a Qualia event for history/replay purposes.
///
/// ---
///
/// These events are tracked for debugging, replay, and analytics.
/// Each event captures a moment where Qualia was generated.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct QualiaEvent {
    /// Unique identifier for this event
    pub id: String,
    
    /// Timestamp when the event occurred (JavaScript timestamp)
    pub timestamp: f64,
    
    /// Position where the Qualia was generated
    pub position: Vec2,
    
    /// Value/intensity of the Qualia generated (0.0 to 1.0)
    pub value: f32,
}

/// # Responsibility
/// Represents the complete, unified state of the combat at a single point in time.
///
/// ---
///
/// This is the primary data structure sent from backend to frontend over WebSocket.
/// It contains all information needed to render the current game state.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CombatState {
    /// High-level game status
    pub game_state: GameStatus,
    
    /// Whether combat is actively running
    pub is_active: bool,
    
    /// Current boss phase number
    pub current_phase: u32,
    
    /// Elapsed time in seconds since combat started
    pub elapsed_time: f64,
    
    /// Song progress (0.0 to 1.0)
    pub song_progress: f32,
    
    /// Complete player state
    pub player: PlayerState,
    
    /// Complete boss state
    pub boss: BossState,
    
    /// IDs of active visual effects
    pub active_effects: Vec<String>,
    
    /// IDs of active environmental effects
    pub environment_effects: Vec<String>,
    
    /// History of recent Qualia generation events
    pub qualia_event_history: Vec<QualiaEvent>,
}

impl Default for CombatState {
    fn default() -> Self {
        Self {
            game_state: GameStatus::default(),
            is_active: false,
            current_phase: 1,
            elapsed_time: 0.0,
            song_progress: 0.0,
            player: PlayerState::default(),
            boss: BossState::default(),
            active_effects: Vec::new(),
            environment_effects: Vec::new(),
            qualia_event_history: Vec::new(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_qualia_state_default() {
        let state = QualiaState::default();
        assert_eq!(state.intensity, 0.0);
        assert_eq!(state.precision, 0.0);
        assert_eq!(state.chaos, 0.0);
    }

    #[test]
    fn test_qualia_state_serialization() {
        let state = QualiaState {
            intensity: 0.8,
            precision: 0.9,
            aggression: 0.5,
            flow: 0.7,
            chaos: 0.2,
            recovery: 0.3,
            transcendence: 0.0,
            collection_window_end: 1000.0,
        };
        
        let json = serde_json::to_string(&state).expect("Failed to serialize");
        let deserialized: QualiaState = serde_json::from_str(&json).expect("Failed to deserialize");
        
        assert_eq!(state, deserialized);
    }

    #[test]
    fn test_player_state_default() {
        let player = PlayerState::default();
        assert_eq!(player.health, 100.0);
        assert_eq!(player.combo, 0);
        assert_eq!(player.score, 0);
        assert!(player.buffs.is_empty());
    }

    #[test]
    fn test_combat_state_serialization_roundtrip() {
        let combat = CombatState::default();
        
        let json = serde_json::to_string(&combat).expect("Failed to serialize");
        let deserialized: CombatState = serde_json::from_str(&json).expect("Failed to deserialize");
        
        assert_eq!(combat, deserialized);
    }

    #[test]
    fn test_game_status_values() {
        assert_eq!(GameStatus::default(), GameStatus::Idle);
        
        let json = serde_json::to_string(&GameStatus::Playing).expect("Failed to serialize");
        assert!(json.contains("playing"));
    }
}
