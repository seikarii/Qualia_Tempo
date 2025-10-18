//! # Responsibility
//! Defines the core game state structures that represent the combat state.
//!
//! ---
//!
//! This module contains `QualiaState`, `PlayerState`, `BossState`, and `CombatState`.
//! These are the primary data structures sent from backend to frontend over WebSocket.

use crate::utils::Vec2;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

/// # Responsibility
/// Represents the player's current emotional/musical state in the game.
///
/// ---
///
/// The qualia state is calculated in real-time based on player actions and
/// musical input. All values are normalized to [0.0, 1.0] range. This struct
/// is the authoritative data structure for player performance and drives
/// visuals/audio in real-time.
///
/// # Fields
/// - `intensity`: Overall energy level (0.0 = calm, 1.0 = maximum energy)
/// - `precision`: Accuracy streaks (0.0 = missing notes, 1.0 = perfect combo)
/// - `aggression`: Fast Forward usage (0.0 = passive, 1.0 = aggressive)
/// - `flow`: Rhythmic consistency (0.0 = chaotic, 1.0 = perfect sync)
/// - `chaos`: Rhythm failures (0.0 = order, 1.0 = maximum chaos)
/// - `recovery`: Rewind usage (0.0 = no recovery, 1.0 = constant rewind)
/// - `transcendence`: Ultimate mode (0.0 = normal, 1.0 = ultimate active)
/// - `collection_window_end`: Timestamp marking end of current Qualia collection window (max 1s)
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct QualiaState {
    pub intensity: f32,
    pub precision: f32,
    pub aggression: f32,
    pub flow: f32,
    pub chaos: f32,
    pub recovery: f32,
    pub transcendence: f32,
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
    pub position: Vec2,
    pub velocity: Vec2,
    pub health: f32,
    pub max_health: f32,
    pub abilities: PlayerAbilities,
    pub is_invulnerable: bool,
    pub combo_count: u32,
    pub buffs: Vec<StatusEffect>,
    pub debuffs: Vec<StatusEffect>,
}

/// # Responsibility
/// Represents the complete state of the boss entity.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BossState {
    pub id: String,
    pub name: String,
    pub position: Vec2,
    pub health: f32,
    pub max_health: f32,
    pub is_vulnerable: bool,
    pub phase: u8,
    pub current_aggression_level: f32, // 0-1
}

/// # Responsibility
/// Enumerates the possible high-level states of the game.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum GameStatus {
    Idle,
    InCombat,
    Paused,
    Victory,
    GameOver,
}

/// # Responsibility
/// Represents a Qualia event for history/replay purposes.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct QualiaEvent {
    pub id: String,
    pub timestamp: f64,
    pub event_type: String,
    pub value: f32,
}

/// # Responsibility
/// Represents the complete, unified state of the combat at a single point in time.
/// This is the primary data structure sent from backend to frontend.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CombatState {
    pub game_state: GameStatus,
    pub player: PlayerState,
    pub boss: BossState,
    pub qualia: QualiaState,
    pub timestamp: f64,
    pub elapsed_time: f64,
    pub score: u32,
    pub qualia_event_history: Vec<QualiaEvent>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_qualia_state_serialization() {
        let state = QualiaState {
            intensity: 0.95,
            precision: 0.8,
            aggression: 0.6,
            flow: 0.9,
            chaos: 0.2,
            recovery: 0.1,
            transcendence: 0.5,
            collection_window_end: 1000.0,
        };

        let json = serde_json::to_string(&state).expect("Failed to serialize");
        let deserialized: QualiaState = serde_json::from_str(&json).expect("Failed to deserialize");

        assert_eq!(state, deserialized);
    }

    #[test]
    fn test_qualia_state_default() {
        let state = QualiaState::default();
        assert_eq!(state.intensity, 0.0);
        assert_eq!(state.precision, 0.0);
        assert_eq!(state.chaos, 0.0);
    }

    #[test]
    fn test_qualia_state_bounds_validation() {
        let state = QualiaState {
            intensity: 0.5,
            precision: 0.5,
            aggression: 0.5,
            flow: 0.5,
            chaos: 0.5,
            recovery: 0.5,
            transcendence: 0.5,
            collection_window_end: 500.0,
        };

        assert!((0.0..=1.0).contains(&state.intensity));
        assert!((0.0..=1.0).contains(&state.precision));
        assert!((0.0..=1.0).contains(&state.aggression));
        assert!((0.0..=1.0).contains(&state.flow));
        assert!((0.0..=1.0).contains(&state.chaos));
        assert!((0.0..=1.0).contains(&state.recovery));
        assert!((0.0..=1.0).contains(&state.transcendence));
    }

    #[test]
    fn test_player_state_serialization() {
        let player = PlayerState {
            position: Vec2::new(10.0, 20.0),
            velocity: Vec2::new(1.0, 2.0),
            health: 80.0,
            max_health: 100.0,
            abilities: PlayerAbilities::default(),
            is_invulnerable: false,
            combo_count: 15,
            buffs: vec![],
            debuffs: vec![],
        };

        let json = serde_json::to_string(&player).expect("Failed to serialize");
        let deserialized: PlayerState = serde_json::from_str(&json).expect("Failed to deserialize");

        assert_eq!(player, deserialized);
    }

    #[test]
    fn test_game_status_serialization() {
        let status = GameStatus::InCombat;
        let json = serde_json::to_string(&status).expect("Failed to serialize");
        assert_eq!(json, "\"IN_COMBAT\"");

        let deserialized: GameStatus = serde_json::from_str(&json).expect("Failed to deserialize");
        assert_eq!(status, deserialized);
    }
}
