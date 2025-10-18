//! # Responsibility
//! Defines core game state contracts for Qualia Tempo.
//!
//! ---
//!
//! Contains QualiaState, PlayerState, BossState, CombatState and related types.
//! These are the primary data structures synchronized between backend and frontend.

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
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Default)]
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

impl QualiaState {
    /// # Responsibility
    /// Creates a new QualiaState with all fields clamped to [0.0, 1.0].
    ///
    /// ---
    ///
    /// This constructor ensures all values are within valid bounds.
    #[must_use]
    pub fn new(
        intensity: f32,
        precision: f32,
        aggression: f32,
        flow: f32,
        chaos: f32,
        recovery: f32,
        transcendence: f32,
        collection_window_end: f64,
    ) -> Self {
        use crate::utils::clamp;
        Self {
            intensity: clamp(intensity, 0.0, 1.0),
            precision: clamp(precision, 0.0, 1.0),
            aggression: clamp(aggression, 0.0, 1.0),
            flow: clamp(flow, 0.0, 1.0),
            chaos: clamp(chaos, 0.0, 1.0),
            recovery: clamp(recovery, 0.0, 1.0),
            transcendence: clamp(transcendence, 0.0, 1.0),
            collection_window_end,
        }
    }

    /// # Responsibility
    /// Validates that all qualia values are within [0.0, 1.0] range.
    ///
    /// ---
    ///
    /// Used for defensive programming and debugging.
    #[must_use]
    pub fn is_valid(&self) -> bool {
        let in_range = |v: f32| (0.0..=1.0).contains(&v);
        in_range(self.intensity)
            && in_range(self.precision)
            && in_range(self.aggression)
            && in_range(self.flow)
            && in_range(self.chaos)
            && in_range(self.recovery)
            && in_range(self.transcendence)
    }
}

/// # Responsibility
/// Represents a single status effect (buff or debuff).
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct StatusEffect {
    pub id: String,
    pub effect_type: String,
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
    pub is_dashing: bool,
    pub is_invulnerable: bool,
    pub combo: u32,
    pub abilities: PlayerAbilities,
    pub buffs: Vec<StatusEffect>,
    pub debuffs: Vec<StatusEffect>,
}

impl Default for PlayerState {
    fn default() -> Self {
        Self {
            position: Vec2::ZERO,
            velocity: Vec2::ZERO,
            health: 100.0,
            max_health: 100.0,
            is_dashing: false,
            is_invulnerable: false,
            combo: 0,
            abilities: PlayerAbilities::default(),
            buffs: Vec::new(),
            debuffs: Vec::new(),
        }
    }
}

/// # Responsibility
/// Represents the complete state of the boss entity.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BossState {
    pub id: String,
    pub position: Vec2,
    pub velocity: Vec2,
    pub health: f32,
    pub max_health: f32,
    pub current_pattern_id: Option<String>,
    pub is_stunned: bool,
    pub phase: u8,
    pub current_aggression_level: f32, // 0-1
}

impl Default for BossState {
    fn default() -> Self {
        Self {
            id: "boss_default".to_string(),
            position: Vec2::ZERO,
            velocity: Vec2::ZERO,
            health: 1000.0,
            max_health: 1000.0,
            current_pattern_id: None,
            is_stunned: false,
            phase: 1,
            current_aggression_level: 0.5,
        }
    }
}

/// # Responsibility
/// Enumerates the possible high-level states of the game.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum GamePhase {
    Idle,
    Playing,
    Paused,
    GameOver,
}

impl Default for GamePhase {
    fn default() -> Self {
        Self::Idle
    }
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
///
/// ---
///
/// This is the primary data structure sent from backend to frontend.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CombatState {
    pub game_phase: GamePhase,
    pub player: PlayerState,
    pub boss: BossState,
    pub qualia: QualiaState,
    pub timestamp: f64,
    pub song_position: f64,
    pub song_duration: f64,
    pub score: u64,
    pub qualia_event_history: Vec<QualiaEvent>,
}

impl Default for CombatState {
    fn default() -> Self {
        Self {
            game_phase: GamePhase::Idle,
            player: PlayerState::default(),
            boss: BossState::default(),
            qualia: QualiaState::default(),
            timestamp: 0.0,
            song_position: 0.0,
            song_duration: 0.0,
            score: 0,
            qualia_event_history: Vec::new(),
        }
    }
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

        let json = serde_json::to_string(&state).unwrap();
        let deserialized: QualiaState = serde_json::from_str(&json).unwrap();

        assert_eq!(state, deserialized);
    }

    #[test]
    fn test_qualia_state_bounds_validation() {
        let state = QualiaState::new(0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 500.0);

        assert!(state.is_valid());
        assert!(state.intensity >= 0.0 && state.intensity <= 1.0);
        assert!(state.precision >= 0.0 && state.precision <= 1.0);
        assert!(state.aggression >= 0.0 && state.aggression <= 1.0);
        assert!(state.flow >= 0.0 && state.flow <= 1.0);
        assert!(state.chaos >= 0.0 && state.chaos <= 1.0);
        assert!(state.recovery >= 0.0 && state.recovery <= 1.0);
        assert!(state.transcendence >= 0.0 && state.transcendence <= 1.0);
    }

    #[test]
    fn test_qualia_state_clamping() {
        let state = QualiaState::new(1.5, -0.5, 2.0, 0.5, -1.0, 1.1, 0.8, 1000.0);

        assert_eq!(state.intensity, 1.0);
        assert_eq!(state.precision, 0.0);
        assert_eq!(state.aggression, 1.0);
        assert_eq!(state.flow, 0.5);
        assert_eq!(state.chaos, 0.0);
        assert_eq!(state.recovery, 1.0);
        assert_eq!(state.transcendence, 0.8);
    }

    #[test]
    fn test_combat_state_serialization() {
        let state = CombatState::default();
        let json = serde_json::to_string(&state).unwrap();
        let deserialized: CombatState = serde_json::from_str(&json).unwrap();

        assert_eq!(state, deserialized);
    }

    #[test]
    fn test_player_state_default() {
        let player = PlayerState::default();
        assert_eq!(player.health, 100.0);
        assert_eq!(player.combo, 0);
        assert!(!player.is_dashing);
    }

    #[test]
    fn test_boss_state_default() {
        let boss = BossState::default();
        assert_eq!(boss.health, 1000.0);
        assert_eq!(boss.phase, 1);
        assert!(!boss.is_stunned);
    }

    #[test]
    fn test_game_phase_enum() {
        let phase = GamePhase::Playing;
        let json = serde_json::to_string(&phase).unwrap();
        assert_eq!(json, r#""PLAYING""#);
    }
}
