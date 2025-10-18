//! # Responsibility
//! Defines combat-specific event types for the `EventBus`.
//!
//! ---
//!
//! This module contains events related to gameplay, combat mechanics,
//! boss AI, and player actions as defined in GDD.md.

use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use crate::contracts::{PlayerAction, QualiaState};

/// # Responsibility
/// Combat-specific events for gameplay logic.
///
/// ---
///
/// These events represent significant combat state changes that multiple
/// services need to react to (AI, rendering, audio, etc.).
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum CombatEvent {
    /// Player performed an action (dash, key press, parry)
    PlayerActionPerformed {
        /// The action that was performed
        action: PlayerAction,
        /// Resulting Qualia state after action
        resulting_qualia: QualiaState,
    },

    /// Boss entered a new phase
    BossPhaseTransition {
        /// Boss identifier
        boss_id: String,
        /// Previous phase number
        old_phase: u8,
        /// New phase number
        new_phase: u8,
        /// Boss HP percentage at transition
        hp_percentage: f32,
    },

    /// Boss is preparing to attack
    BossAttackTelegraph {
        /// Attack identifier
        attack_id: String,
        /// Attack type
        attack_type: String,
        /// Telegraph duration in milliseconds
        telegraph_duration_ms: u32,
        /// Target position (x, y, z)
        target_position: [f32; 3],
    },

    /// Boss executed an attack
    BossAttackExecuted {
        /// Attack identifier
        attack_id: String,
        /// Attack type
        attack_type: String,
        /// Did it hit the player?
        hit_player: bool,
        /// Damage dealt (if hit)
        damage: Option<f32>,
    },

    /// Player took damage
    PlayerDamaged {
        /// Damage amount
        damage: f32,
        /// Remaining HP after damage
        remaining_hp: f32,
        /// Source of damage
        source: String,
    },

    /// Player successfully parried an attack
    PlayerParried {
        /// Attack that was parried
        attack_id: String,
        /// Parry timing accuracy (0.0 = late, 1.0 = perfect)
        accuracy: f32,
    },

    /// Player successfully dodged an attack via dash
    PlayerDodged {
        /// Attack that was dodged
        attack_id: String,
        /// Was dash timed to the beat?
        on_beat: bool,
    },

    /// Musical combo was triggered
    ComboTriggered {
        /// Combo identifier (e.g., "Q+E+R", "Q+R+F")
        combo_id: String,
        /// Is it a beneficial or chaotic combo?
        is_beneficial: bool,
        /// Effect description
        effect_description: String,
    },

    /// Combo streak increased
    ComboIncreased {
        /// New combo count
        combo_count: u32,
        /// Combo multiplier (e.g., 1.5x, 2.0x)
        multiplier: f32,
    },

    /// Combo was broken
    ComboBroken {
        /// Final combo count
        final_combo: u32,
        /// Reason for break
        reason: String,
    },

    /// Ultimate ability activated
    UltimateActivated {
        /// Current Qualia charge
        qualia_charge: f32,
        /// Ultimate duration in seconds
        duration_sec: f64,
    },

    /// Ultimate ability ended
    UltimateEnded {
        /// Reason for end (e.g., "expired", "cancelled")
        reason: String,
    },

    /// Qualia particle collected
    QualiaCollected {
        /// Qualia value
        value: f32,
        /// Collection timing accuracy (0.0 - 1.0)
        timing_accuracy: f32,
        /// Position where collected
        position: [f32; 3],
    },

    /// Environmental hazard triggered
    HazardTriggered {
        /// Hazard identifier
        hazard_id: String,
        /// Hazard type
        hazard_type: String,
        /// Affected area center
        position: [f32; 3],
        /// Affected area radius
        radius: f32,
    },

    /// Boss is triggering an attack pattern
    BossAttack {
        /// Pattern data to execute
        pattern: crate::contracts::PatternData,
    },

    /// Boss attack pattern is being telegraphed
    PatternTelegraph {
        /// Pattern being telegraphed
        pattern: crate::contracts::PatternData,
    },

    /// Projectile spawned from pattern
    ProjectileSpawned {
        /// Spawn position
        position: crate::utils::Vec2,
        /// Damage value
        damage: f32,
        /// Source pattern ID
        pattern_id: String,
    },
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_boss_phase_transition_event() {
        let event = CombatEvent::BossPhaseTransition {
            boss_id: "cerberus".to_string(),
            old_phase: 1,
            new_phase: 2,
            hp_percentage: 0.5,
        };

        let json = serde_json::to_string(&event).unwrap();
        let deserialized: CombatEvent = serde_json::from_str(&json).unwrap();

        match deserialized {
            CombatEvent::BossPhaseTransition {
                boss_id,
                old_phase,
                new_phase,
                hp_percentage,
            } => {
                assert_eq!(boss_id, "cerberus");
                assert_eq!(old_phase, 1);
                assert_eq!(new_phase, 2);
                assert_eq!(hp_percentage, 0.5);
            }
            _ => panic!("Wrong event type"),
        }
    }

    #[test]
    fn test_combo_triggered_event() {
        let event = CombatEvent::ComboTriggered {
            combo_id: "Q+E+R".to_string(),
            is_beneficial: true,
            effect_description: "Remolino (area control)".to_string(),
        };

        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("comboTriggered"));
        assert!(json.contains("Q+E+R"));
    }

    #[test]
    fn test_player_damaged_event() {
        let event = CombatEvent::PlayerDamaged {
            damage: 25.0,
            remaining_hp: 75.0,
            source: "boss_fireball".to_string(),
        };

        let json = serde_json::to_string(&event).unwrap();
        let deserialized: CombatEvent = serde_json::from_str(&json).unwrap();

        match deserialized {
            CombatEvent::PlayerDamaged {
                damage,
                remaining_hp,
                source,
            } => {
                assert_eq!(damage, 25.0);
                assert_eq!(remaining_hp, 75.0);
                assert_eq!(source, "boss_fireball");
            }
            _ => panic!("Wrong event type"),
        }
    }
}
