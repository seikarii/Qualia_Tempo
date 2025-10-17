//! # Responsibility
//! Contains all event definitions for the EventBus.
//!
//! ---
//!
//! This module defines the GameEvent enum which enumerates all possible events
//! that flow through the tokio::sync::broadcast EventBus. Events are the primary
//! communication mechanism between services in the event-driven architecture.

use serde::{Deserialize, Serialize};
use crate::contracts::{
    game_state::{QualiaState, PlayerState, BossState, CombatState},
    audio::PlayGenerativeNote,
};

/// # Responsibility
/// Enumerates all events that can flow through the EventBus.
///
/// ---
///
/// Events are the primary communication mechanism between services.
/// All variants must be Clone for broadcast distribution via tokio::sync::broadcast.
///
/// ## Event Categories
/// - **Player Events**: PlayerAction, PlayerStateUpdated
/// - **Qualia Events**: QualiaStateUpdated, QualiaThresholdCrossed
/// - **Combat Events**: BossStateChanged, CombatStateUpdated, DamageDealt
/// - **Audio Events**: PlayGenerativeNote, HarmonyChanged
/// - **System Events**: GameStarted, GamePaused, GameResumed, GameEnded
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "eventType", rename_all = "camelCase")]
pub enum GameEvent {
    /// Player performed an action (dash, note hit, ability use)
    PlayerAction {
        /// Action type (see PlayerAction in contracts)
        action: String,
        
        /// Timestamp when action occurred
        timestamp: f64,
        
        /// Accuracy of the action (0.0 to 1.0)
        accuracy: f32,
    },
    
    /// Player state was updated
    PlayerStateUpdated(PlayerState),
    
    /// Qualia state was recalculated
    QualiaStateUpdated(QualiaState),
    
    /// A Qualia threshold was crossed (triggers effects)
    QualiaThresholdCrossed {
        /// Qualia dimension that crossed threshold (e.g., "intensity", "chaos")
        dimension: String,
        
        /// New value after crossing
        new_value: f32,
        
        /// Direction of crossing ("up" or "down")
        direction: String,
    },
    
    /// Boss state changed (phase transition, pattern activation)
    BossStateChanged(BossState),
    
    /// Complete combat state snapshot
    CombatStateUpdated(CombatState),
    
    /// Damage was dealt to player or boss
    DamageDealt {
        /// Target entity ID
        target: String,
        
        /// Damage amount
        amount: f32,
        
        /// Whether this was a critical hit
        is_critical: bool,
    },
    
    /// Commands the frontend Performance Engine to generate a sound
    PlayGenerativeNote(PlayGenerativeNote),
    
    /// Harmonic context changed (new chord progression)
    HarmonyChanged {
        /// New chord (e.g., "Am7", "G", "Cmaj7")
        chord: String,
        
        /// Timestamp of change
        timestamp: f64,
    },
    
    /// Game session started
    GameStarted {
        /// Song ID being played
        song_id: String,
        
        /// Difficulty selected
        difficulty: String,
    },
    
    /// Game was paused
    GamePaused,
    
    /// Game was resumed from pause
    GameResumed,
    
    /// Game session ended
    GameEnded {
        /// Whether player won
        victory: bool,
        
        /// Final score
        final_score: u64,
        
        /// Maximum combo achieved
        max_combo: u32,
        
        /// Final accuracy (0.0 to 1.0)
        accuracy: f32,
    },
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_game_event_serialization() {
        let event = GameEvent::GamePaused;
        let json = serde_json::to_string(&event).expect("Failed to serialize");
        // With camelCase, the event type is "gamePaused"
        assert!(json.contains("gamePaused"));
    }

    #[test]
    fn test_qualia_state_updated_event() {
        let qualia = QualiaState::default();
        let event = GameEvent::QualiaStateUpdated(qualia);
        
        let json = serde_json::to_string(&event).expect("Failed to serialize");
        let deserialized: GameEvent = serde_json::from_str(&json).expect("Failed to deserialize");
        
        match deserialized {
            GameEvent::QualiaStateUpdated(_) => {},
            _ => panic!("Wrong event type"),
        }
    }

    #[test]
    fn test_damage_dealt_event() {
        let event = GameEvent::DamageDealt {
            target: "player".to_string(),
            amount: 25.0,
            is_critical: true,
        };
        
        let json = serde_json::to_string(&event).expect("Failed to serialize");
        // With camelCase, the event type is "damageDealt"
        assert!(json.contains("damageDealt"));
        assert!(json.contains("\"amount\":25"));
    }
}
