//! # Responsibility
//! Defines combat-specific event types for gameplay state transitions and boss behavior.
//!
//! ---
//!
//! This module implements combat events from GDD.md and ARCHITECTURE.RUST.md.
//! These events drive the core gameplay loop and boss AI reactions.

use serde::{Deserialize, Serialize};
use crate::contracts::game_state::QualiaState;
use crate::utils::math::Vector3;

/// # Responsibility
/// Event signaling a player combo completion.
///
/// ---
///
/// Emitted by GameLogicService when player successfully executes a musical combo.
/// Consumed by: BossAIService (triggers reactions), VisualEffectsService (particle burst).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ComboCompletedEvent {
    pub combo_id: String,
    pub combo_name: String,
    pub is_beneficial: bool,
    pub qualia_generated: f32,
    pub timestamp: f64,
}

/// # Responsibility
/// Event signaling boss phase transition.
///
/// ---
///
/// Emitted when boss health crosses a phase threshold.
/// Triggers: New attack patterns, environmental changes, music intensity shift.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PhaseTransitionEvent {
    pub previous_phase: u8,
    pub new_phase: u8,
    pub boss_health_percent: f32,
    pub timestamp: f64,
}

/// # Responsibility
/// Event signaling a boss attack pattern starting.
///
/// ---
///
/// Emitted by BossAIService when initiating an attack.
/// Frontend uses this to render telegraph animations and audio cues.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BossAttackStartEvent {
    pub pattern_id: String,
    pub pattern_name: String,
    pub telegraph_duration_sec: f64,
    pub spawn_position: Vector3,
    pub timestamp: f64,
}

/// # Responsibility
/// Event signaling player took damage.
///
/// ---
///
/// Triggers screen shake, damage feedback UI, and health bar update.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PlayerDamagedEvent {
    pub damage_amount: f32,
    pub remaining_health: f32,
    pub was_fatal: bool,
    pub timestamp: f64,
}

/// # Responsibility
/// Event signaling player healed.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PlayerHealedEvent {
    pub heal_amount: f32,
    pub new_health: f32,
    pub timestamp: f64,
}

/// # Responsibility
/// Event signaling boss took damage.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct BossDamagedEvent {
    pub damage_amount: f32,
    pub remaining_health: f32,
    pub timestamp: f64,
}

/// # Responsibility
/// Event signaling Qualia collection by player.
///
/// ---
///
/// Emitted when player successfully collects a Qualia particle.
/// Updates QualiaState and triggers visual/audio feedback.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct QualiaCollectedEvent {
    pub qualia_value: f32,
    pub collection_position: Vector3,
    pub was_perfect_timing: bool,
    pub new_qualia_state: QualiaState,
    pub timestamp: f64,
}

/// # Responsibility
/// Event signaling combat encounter completed.
///
/// ---
///
/// Emitted when boss health reaches 0 or player health reaches 0.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CombatEndEvent {
    pub victory: bool,
    pub final_score: u64,
    pub max_combo: u32,
    pub accuracy: f32,
    pub completion_time_sec: f64,
    pub timestamp: f64,
}

/// # Responsibility
/// Aggregates all combat event types.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum CombatEvent {
    ComboCompleted(ComboCompletedEvent),
    PhaseTransition(PhaseTransitionEvent),
    BossAttackStart(BossAttackStartEvent),
    PlayerDamaged(PlayerDamagedEvent),
    PlayerHealed(PlayerHealedEvent),
    BossDamaged(BossDamagedEvent),
    QualiaCollected(QualiaCollectedEvent),
    CombatEnd(CombatEndEvent),
}
