//! # Responsibility
//! Defines the main GameEvent enum that flows through the EventBus.
//!
//! ---
//!
//! This is the central event aggregation point. All specific event types
//! (audio, combat, system) are included here for unified EventBus distribution.

use serde::{Deserialize, Serialize};
use crate::contracts::{PlayerAction, QualiaState, BossState, CombatState, PlayGenerativeNote};
use super::audio_events::{AudioEvent, MetronomeTickEvent};
use super::combat_events::CombatEvent;
use super::system_events::SystemEvent;

/// # Responsibility
/// Enumerates all events that can flow through the EventBus.
///
/// ---
///
/// Events are the primary communication mechanism between services.
/// All variants must be Clone for broadcast distribution via tokio::sync::broadcast.
///
/// Large variants are boxed to prevent enum size bloat (clippy::large_enum_variant).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "eventType", rename_all = "camelCase")]
pub enum GameEvent {
    // ===== Core Game Events =====
    
    /// Game loop started (frontend game controller initialized)
    GameStarted,
    
    /// Game loop paused (player paused or switched to menu)
    GamePaused,
    
    /// Frame update event (emitted every frame at ~60 FPS)
    FrameUpdate {
        delta_time: f64,     // Time since last frame in seconds
        frame_number: u32,   // Monotonically increasing frame counter
    },
    
    /// Player performed an action (boxed due to size)
    PlayerAction(Box<PlayerAction>),
    
    /// Player action validated with timing accuracy
    PlayerActionValidated {
        action: Box<PlayerAction>,
        accuracy: f32,        // 0.0 to 1.0 (0.0 = Miss, 1.0 = Perfect)
        timing_offset_ms: f32, // Distance from nearest beat in milliseconds
    },
    
    /// Qualia state was updated
    QualiaStateUpdated(QualiaState),
    
    /// Boss state changed (boxed due to size)
    BossStateChanged(Box<BossState>),
    
    /// Complete combat state snapshot (boxed due to size)
    CombatStateUpdated(Box<CombatState>),
    
    // ===== Audio Events =====
    
    /// Commands the frontend Performance Engine to generate a sound (boxed due to size)
    PlayGenerativeNote(Box<PlayGenerativeNote>),
    
    /// Metronome tick event (for rhythm sync)
    MetronomeTick(MetronomeTickEvent),
    
    /// Generic audio event wrapper
    Audio(AudioEvent),
    
    // ===== Combat Events =====
    
    /// Combat-specific events (combo completion, damage, phase transitions)
    Combat(CombatEvent),
    
    // ===== System Events =====
    
    /// System/lifecycle events (connection, shutdown, errors)
    System(SystemEvent),
    
    // ===== Gameplay Events (Part 9 additions) =====
    
    /// Damage was dealt to a target entity
    DamageDealt {
        source_id: String,
        target_id: String,
        amount: f32,
        was_critical: bool,
    },
    
    /// Player combo counter was updated
    ComboUpdated {
        combo: u32,
    },
    
    /// Player score was updated
    ScoreUpdated {
        score: u32,
    },
    
    /// Boss AI selected next action/pattern
    BossActionSelected {
        pattern_id: String,
        aggression: f32,
    },
    
    /// Boss executed an attack
    BossAttack {
        attack_type: String,
        damage: f32,
        position: (f32, f32),
    },
    
    /// Game phase changed (menu, combat, victory, defeat)
    GamePhaseChanged {
        previous_phase: crate::contracts::GamePhase,
        new_phase: crate::contracts::GamePhase,
        boss_phase: Option<u8>,
    },
    
    /// Victory achieved (boss defeated)
    VictoryAchieved {
        final_score: u32,
        final_qualia: QualiaState,
    },
    
    /// Defeat occurred (player died)
    DefeatOccurred {
        reason: String,
    },
}

