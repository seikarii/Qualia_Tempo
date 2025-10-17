//! # Responsibility
//! Defines core game state structures per DATA.RUST.md specification.

use serde::{Deserialize, Serialize};
use schemars::JsonSchema;
use crate::utils::Vec2;

/// # Responsibility
/// Represents the player's current emotional/musical state in the game.
///
/// ---
///
/// The qualia state is calculated in real-time based on player actions and
/// musical input. All values are normalized to [0.0, 1.0] range.
/// 
/// Directly translated from DATA.RUST.md and prototype's QualiaState.d.ts.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct QualiaState {
    /// Overall energy level (0-1)
    pub intensity: f32,
    /// Musical coherence (0-1)
    pub harmony: f32,
    /// Unpredictability and entropy (0-1)
    pub chaos: f32,
    /// Perfect timing moments (0-1)
    pub kairos: f32,
    /// Current combo multiplier
    pub combo: u32,
    /// Timestamp when state was calculated (ms since epoch)
    pub timestamp: u64,
}

impl Default for QualiaState {
    fn default() -> Self {
        Self {
            intensity: 0.0,
            harmony: 0.0,
            chaos: 0.0,
            kairos: 0.0,
            combo: 0,
            timestamp: 0,
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
/// Represents the state of the player's dash ability.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct DashAbilityState {
    pub is_ready: bool,
    pub cooldown_remaining: f64, // ms
}

/// # Responsibility
/// Represents the state of the player's parry ability.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct ParryAbilityState {
    pub is_ready: bool,
    pub cooldown_remaining: f64, // ms
}

/// # Responsibility
/// Represents the state of the player's ultimate ability.
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
    pub health: f32,
    pub max_health: f32,
    pub is_invulnerable: bool,
    pub is_dashing: bool,
    pub velocity: Vec2,
    pub abilities: PlayerAbilities,
    pub buffs: Vec<StatusEffect>,
    pub debuffs: Vec<StatusEffect>,
}

impl Default for PlayerState {
    fn default() -> Self {
        Self {
            position: Vec2::zero(),
            health: 100.0,
            max_health: 100.0,
            is_invulnerable: false,
            is_dashing: false,
            velocity: Vec2::zero(),
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
    pub name: String,
    pub position: Vec2,
    pub health: f32,
    pub max_health: f32,
    pub phase: u8,
    pub is_transitioning: bool,
    pub velocity: Vec2,
    pub current_aggression_level: f32, // 0-1
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
            is_transitioning: false,
            velocity: Vec2::zero(),
            current_aggression_level: 0.0,
        }
    }
}

/// # Responsibility
/// Enumerates the possible high-level states of the game.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum GameStatus {
    Idle,
    Loading,
    Playing,
    Paused,
    GameOver,
}

impl Default for GameStatus {
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
    pub event_type: String,
    pub timestamp: u64,
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
    pub current_time: f64, // Game time in seconds
    pub elapsed_time: f64, // Total elapsed time in seconds
    pub score: u64,
    pub qualia_event_history: Vec<QualiaEvent>,
}

impl Default for CombatState {
    fn default() -> Self {
        Self {
            game_state: GameStatus::default(),
            player: PlayerState::default(),
            boss: BossState::default(),
            qualia: QualiaState::default(),
            current_time: 0.0,
            elapsed_time: 0.0,
            score: 0,
            qualia_event_history: Vec::new(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn qualia_state_default_values() {
        let state = QualiaState::default();
        assert_eq!(state.intensity, 0.0);
        assert_eq!(state.harmony, 0.0);
        assert_eq!(state.chaos, 0.0);
        assert_eq!(state.kairos, 0.0);
        assert_eq!(state.combo, 0);
    }

    #[test]
    fn qualia_state_serialization() {
        let state = QualiaState {
            intensity: 0.5,
            harmony: 0.8,
            chaos: 0.2,
            kairos: 0.9,
            combo: 42,
            timestamp: 123456789,
        };
        
        let json = serde_json::to_string(&state).unwrap();
        let deserialized: QualiaState = serde_json::from_str(&json).unwrap();
        
        assert_eq!(state, deserialized);
    }

    #[test]
    fn player_state_default() {
        let player = PlayerState::default();
        assert_eq!(player.health, 100.0);
        assert_eq!(player.max_health, 100.0);
        assert!(!player.is_invulnerable);
        assert!(!player.is_dashing);
    }

    #[test]
    fn boss_state_default() {
        let boss = BossState::default();
        assert_eq!(boss.health, 1000.0);
        assert_eq!(boss.phase, 1);
        assert!(!boss.is_transitioning);
    }

    #[test]
    fn combat_state_complete_serialization() {
        let combat = CombatState::default();
        let json = serde_json::to_string(&combat).unwrap();
        let deserialized: CombatState = serde_json::from_str(&json).unwrap();
        assert_eq!(combat, deserialized);
    }

    #[test]
    fn game_status_variants() {
        let statuses = vec![
            GameStatus::Idle,
            GameStatus::Loading,
            GameStatus::Playing,
            GameStatus::Paused,
            GameStatus::GameOver,
        ];
        
        for status in statuses {
            let json = serde_json::to_string(&status).unwrap();
            let deserialized: GameStatus = serde_json::from_str(&json).unwrap();
            assert_eq!(status, deserialized);
        }
    }
}
