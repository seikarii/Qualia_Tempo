//! # Responsibility
//! Defines the GameEvent enum containing all event types for the EventBus.
//!
//! ---
//!
//! This is the central event contract for the entire application. All services
//! communicate via this enum over the EventBus (tokio::sync::broadcast).
//! Uses tagged enum serialization for clean JSON when needed for debugging/logging.

use serde::{Deserialize, Serialize};
use crate::contracts::{QualiaState, PlayerAction, CombatState};

/// # Responsibility
/// Enumerates all events that flow through the EventBus.
///
/// ---
///
/// This enum is Clone (required for broadcast channel) and Serialize/Deserialize
/// for potential logging or cross-process communication. Each variant contains
/// the minimal data needed for that event type.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "eventType", rename_all = "camelCase")]
pub enum GameEvent {
    /// Player performed an action
    PlayerAction(PlayerAction),
    
    /// Qualia state was updated
    QualiaStateUpdated(QualiaState),
    
    /// Complete combat state was updated (sent to frontend)
    /// Boxed to reduce enum size per clippy::large_enum_variant
    CombatStateUpdated(Box<CombatState>),
    
    /// Boss entered a new phase
    BossPhaseTransition {
        old_phase: u8,
        new_phase: u8,
        timestamp: u64,
    },
    
    /// Player achieved a combo milestone
    ComboMilestone {
        combo_count: u32,
        timestamp: u64,
    },
    
    /// Player took damage
    PlayerDamaged {
        damage_amount: f32,
        remaining_health: f32,
        timestamp: u64,
    },
    
    /// Boss took damage
    BossDamaged {
        damage_amount: f32,
        remaining_health: f32,
        timestamp: u64,
    },
    
    /// Game phase changed
    GamePhaseChanged {
        old_phase: String,
        new_phase: String,
        timestamp: u64,
    },
    
    /// Application started
    ApplicationStarted {
        timestamp: u64,
    },
    
    /// Application shutting down
    ApplicationShutdown {
        timestamp: u64,
    },
    
    /// Error occurred
    ErrorOccurred {
        message: String,
        source: String,
        timestamp: u64,
    },
}
