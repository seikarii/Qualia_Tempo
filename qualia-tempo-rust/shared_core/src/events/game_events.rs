//! # Responsibility
//! Defines the unified GameEvent enum for all event-driven communication.

use serde::{Deserialize, Serialize};
use schemars::JsonSchema;
use crate::contracts::{PlayerAction, QualiaState, CombatState, BossState};

/// # Responsibility
/// Unified event type for the entire game system.
///
/// ---
///
/// This enum represents all possible events that can flow through the EventBus.
/// Services subscribe to specific variants using pattern matching in #[handle_event] handlers.
/// Implements Clone for tokio::sync::broadcast compatibility.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum GameEvent {
    // === SYSTEM LIFECYCLE EVENTS ===
    /// Game system initialized and ready
    SystemInitialized {
        timestamp: u64,
    },
    
    /// Game system shutting down
    SystemShutdown {
        timestamp: u64,
    },
    
    /// Game started (player pressed start)
    GameStarted {
        timestamp: u64,
        song_id: String,
    },
    
    /// Game paused
    GamePaused {
        timestamp: u64,
    },
    
    /// Game resumed
    GameResumed {
        timestamp: u64,
    },
    
    /// Game ended (victory or defeat)
    GameEnded {
        timestamp: u64,
        victory: bool,
        final_score: u64,
    },
    
    // === PLAYER EVENTS ===
    /// Player performed an action
    PlayerAction {
        action: PlayerAction,
    },
    
    /// Player state updated (health, position, etc.)
    PlayerStateUpdated {
        health: f32,
        position_x: f32,
        position_y: f32,
        is_invulnerable: bool,
    },
    
    /// Player took damage
    PlayerDamaged {
        damage: f32,
        source: String,
        timestamp: u64,
    },
    
    /// Player died
    PlayerDied {
        timestamp: u64,
    },
    
    // === QUALIA EVENTS ===
    /// Qualia state calculated and updated
    QualiaStateUpdated {
        state: QualiaState,
    },
    
    /// Qualia orb spawned in the arena
    QualiaSpawned {
        position_x: f32,
        position_y: f32,
        qualia_type: String,
        value: f32,
        timestamp: u64,
    },
    
    // === BOSS EVENTS ===
    /// Boss changed phase
    BossPhaseChanged {
        boss_id: String,
        new_phase: u8,
        timestamp: u64,
    },
    
    /// Boss performed an attack
    BossAttack {
        attack_id: String,
        attack_type: String,
        position_x: f32,
        position_y: f32,
        timestamp: u64,
    },
    
    /// Boss state updated
    BossStateUpdated {
        state: Box<BossState>,
    },
    
    /// Boss died (song ended)
    BossDefeated {
        boss_id: String,
        timestamp: u64,
        final_score: u64,
    },
    
    // === COMBAT EVENTS ===
    /// Complete combat state synchronized
    CombatStateSync {
        state: Box<CombatState>,
    },
    
    /// Combo level changed
    ComboChanged {
        new_combo: u32,
        timestamp: u64,
    },
    
    // === AUDIO EVENTS ===
    /// Metronome tick (rhythm event)
    MetronomeTick {
        beat_number: u32,
        timestamp: u64,
        bpm: f32,
    },
    
    /// Musical note should be played
    PlayNote {
        note: String,
        velocity: f32,
        duration_ms: u32,
        timestamp: u64,
    },
    
    // === ERROR EVENTS ===
    /// Critical error occurred
    ErrorOccurred {
        message: String,
        error_type: String,
        timestamp: u64,
    },
}

impl GameEvent {
    /// Get the timestamp of this event (if available)
    #[must_use]
    pub const fn timestamp(&self) -> Option<u64> {
        match self {
            Self::SystemInitialized { timestamp }
            | Self::GameStarted { timestamp, .. }
            | Self::GamePaused { timestamp }
            | Self::GameResumed { timestamp }
            | Self::GameEnded { timestamp, .. }
            | Self::PlayerDamaged { timestamp, .. }
            | Self::PlayerDied { timestamp }
            | Self::QualiaSpawned { timestamp, .. }
            | Self::BossPhaseChanged { timestamp, .. }
            | Self::BossAttack { timestamp, .. }
            | Self::BossDefeated { timestamp, .. }
            | Self::ComboChanged { timestamp, .. }
            | Self::MetronomeTick { timestamp, .. }
            | Self::PlayNote { timestamp, .. }
            | Self::ErrorOccurred { timestamp, .. } => Some(*timestamp),
            _ => None,
        }
    }
    
    /// Check if this is a critical system event
    #[must_use]
    pub const fn is_critical(&self) -> bool {
        matches!(
            self,
            Self::ErrorOccurred { .. }
                | Self::PlayerDied { .. }
                | Self::GameEnded { .. }
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::utils::Vec2;

    #[test]
    fn game_event_timestamp_extraction() {
        let event = GameEvent::GameStarted {
            timestamp: 12345,
            song_id: "test_song".to_string(),
        };
        assert_eq!(event.timestamp(), Some(12345));
        
        let event_no_timestamp = GameEvent::QualiaStateUpdated {
            state: QualiaState::default(),
        };
        assert_eq!(event_no_timestamp.timestamp(), None);
    }

    #[test]
    fn game_event_critical_detection() {
        let critical = GameEvent::ErrorOccurred {
            message: "Critical error".to_string(),
            error_type: "system".to_string(),
            timestamp: 100,
        };
        assert!(critical.is_critical());
        
        let non_critical = GameEvent::MetronomeTick {
            beat_number: 1,
            timestamp: 100,
            bpm: 120.0,
        };
        assert!(!non_critical.is_critical());
    }

    #[test]
    fn game_event_serialization() {
        let event = GameEvent::PlayerAction {
            action: PlayerAction::KeyPressed {
                key: 'Q',
                timestamp: 999,
                accuracy: 0.95,
            },
        };
        
        let json = serde_json::to_string(&event).unwrap();
        let deserialized: GameEvent = serde_json::from_str(&json).unwrap();
        
        assert_eq!(event, deserialized);
    }

    #[test]
    fn game_event_all_variants_serializable() {
        let events = vec![
            GameEvent::SystemInitialized { timestamp: 1 },
            GameEvent::GameStarted { timestamp: 2, song_id: "song1".to_string() },
            GameEvent::GamePaused { timestamp: 3 },
            GameEvent::GameResumed { timestamp: 4 },
            GameEvent::GameEnded { timestamp: 5, victory: true, final_score: 1000 },
            GameEvent::PlayerAction {
                action: PlayerAction::Dash {
                    direction: Vec2::new(1.0, 0.0),
                    timestamp: 6,
                    perfect_timing: true,
                },
            },
            GameEvent::PlayerStateUpdated {
                health: 100.0,
                position_x: 0.0,
                position_y: 0.0,
                is_invulnerable: false,
            },
            GameEvent::QualiaStateUpdated {
                state: QualiaState::default(),
            },
            GameEvent::MetronomeTick {
                beat_number: 1,
                timestamp: 7,
                bpm: 120.0,
            },
        ];
        
        for event in events {
            let json = serde_json::to_string(&event).unwrap();
            let deserialized: GameEvent = serde_json::from_str(&json).unwrap();
            assert_eq!(event, deserialized);
        }
    }
    
    #[test]
    fn game_event_clone_for_broadcast() {
        // Verify GameEvent implements Clone (required for tokio::sync::broadcast)
        let event = GameEvent::QualiaStateUpdated {
            state: QualiaState::default(),
        };
        
        let cloned = event.clone();
        assert_eq!(event, cloned);
    }
    
    #[test]
    fn game_event_boxed_variants() {
        // Test that boxed variants work correctly
        let combat_event = GameEvent::CombatStateSync {
            state: Box::new(CombatState::default()),
        };
        
        let json = serde_json::to_string(&combat_event).unwrap();
        let deserialized: GameEvent = serde_json::from_str(&json).unwrap();
        assert_eq!(combat_event, deserialized);
        
        let boss_event = GameEvent::BossStateUpdated {
            state: Box::new(BossState::default()),
        };
        
        let json = serde_json::to_string(&boss_event).unwrap();
        let deserialized: GameEvent = serde_json::from_str(&json).unwrap();
        assert_eq!(boss_event, deserialized);
    }
}
