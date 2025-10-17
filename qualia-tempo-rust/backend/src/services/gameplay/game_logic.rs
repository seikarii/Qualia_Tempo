//! # Responsibility
//! GameLogicService implementation for core game rule processing.
//!
//! ---
//!
//! Processes player actions, calculates damage/score/combo, and emits game events.
//! This is the authoritative source for all game state mutations.

use shaku::Component;
use async_trait::async_trait;
use std::sync::Arc;
use anyhow::{Context, Result};
use tracing::{info, warn};

use crate::config::game_logic::GameLogicConfig;
use crate::services::interfaces::{IGameLogicService, ILogger, IEventBus};
use shared_core::contracts::{PlayerAction, QualiaState, PlayerState, BossState};
use shared_core::events::GameEvent;

/// # Responsibility
/// Implements core game logic rules for Qualia Tempo combat.
///
/// ---
///
/// This service is the authoritative source for:
/// - Damage calculation (accuracy + combo based)
/// - Score calculation (base score * accuracy * combo multiplier)
/// - Combo management (maintains/breaks based on accuracy)
/// - Victory/defeat detection (health checks)
///
/// Injected dependencies:
/// - GameLogicConfig: Game rule parameters
/// - ILogger: Structured logging
/// - IEventBus: Event emission for state updates
#[derive(Component)]
#[shaku(interface = IGameLogicService)]
pub struct GameLogicService {
    config: Arc<GameLogicConfig>,
    
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,
    
    #[shaku(inject)]
    event_bus: Arc<dyn IEventBus>,
}

#[async_trait]
impl IGameLogicService for GameLogicService {
    async fn process_action(
        &self,
        action: PlayerAction,
        current_qualia: QualiaState,
        current_player: &PlayerState,
        current_boss: &BossState,
    ) -> Result<(QualiaState, Vec<GameEvent>)> {
        let mut events = Vec::new();
        
        // Extract accuracy from action
        let accuracy = self.extract_accuracy(&action)?;
        
        // Calculate damage
        let damage = self.calculate_damage(accuracy, current_player.combo);
        
        // Emit damage event
        events.push(GameEvent::DamageDealt {
            damage,
            target: "boss".to_string(),
        });
        
        // Update combo
        let new_combo = self.update_combo(current_player.combo, accuracy >= self.config.combo.min_accuracy_for_combo, accuracy);
        if new_combo != current_player.combo {
            events.push(GameEvent::ComboUpdated { combo: new_combo });
        }
        
        // Calculate score
        let score_gain = self.calculate_score(self.config.scoring.base_score_per_action, accuracy, new_combo);
        events.push(GameEvent::ScoreUpdated { score_delta: score_gain as i32 });
        
        self.logger.info(&format!(
            "Processed action: damage={:.1}, combo={}, score_gain={}",
            damage, new_combo, score_gain
        ));
        
        Ok((current_qualia, events))
    }
    
    fn calculate_damage(&self, accuracy: f32, combo: u32) -> f32 {
        let accuracy_clamped = accuracy.clamp(0.0, 1.0);
        let combo_multiplier = 1.0 + (combo as f32 * self.config.scoring.combo_multiplier_per_hit).min(self.config.scoring.max_combo_multiplier - 1.0);
        
        let damage = self.config.player.base_damage * accuracy_clamped * combo_multiplier;
        
        damage.clamp(0.0, self.config.player.base_damage * self.config.scoring.max_combo_multiplier)
    }
    
    fn update_combo(&self, current_combo: u32, action_success: bool, accuracy: f32) -> u32 {
        if !action_success || accuracy < self.config.combo.min_accuracy_for_combo {
            // Combo broken
            0
        } else {
            // Combo continues
            (current_combo + 1).min(self.config.combo.max_combo)
        }
    }
    
    fn calculate_score(&self, base_score: u32, accuracy: f32, combo: u32) -> u32 {
        let accuracy_clamped = accuracy.clamp(0.0, 1.0);
        let combo_multiplier = 1.0 + (combo as f32 * self.config.scoring.combo_multiplier_per_hit).min(self.config.scoring.max_combo_multiplier - 1.0);
        
        let score = (base_score as f32) * accuracy_clamped * self.config.scoring.accuracy_multiplier * combo_multiplier;
        
        score.round() as u32
    }
    
    fn is_player_defeated(&self, player: &PlayerState) -> bool {
        player.health <= 0.0
    }
    
    fn is_boss_defeated(&self, boss: &BossState) -> bool {
        boss.health <= 0.0
    }
}

impl GameLogicService {
    /// Extracts accuracy value from PlayerAction.
    fn extract_accuracy(&self, action: &PlayerAction) -> Result<f32> {
        match action {
            PlayerAction::KeyPressed { accuracy, .. } => Ok(*accuracy),
            PlayerAction::Dash { accuracy, .. } => Ok(*accuracy),
            PlayerAction::Special { accuracy, .. } => Ok(*accuracy),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::game_logic::{PlayerConfig, BossConfig, ScoringConfig, ComboConfig};
    
    fn create_test_config() -> GameLogicConfig {
        GameLogicConfig {
            player: PlayerConfig {
                max_health: 100.0,
                base_damage: 10.0,
                dash_cooldown_ms: 1000,
                dash_duration_ms: 200,
                invulnerability_frames: 10,
            },
            boss: BossConfig {
                max_health: 1000.0,
                phase_count: 4,
                phase_health_thresholds: vec![1.0, 0.75, 0.5, 0.25],
                attack_speed_multipliers: vec![1.0, 1.2, 1.5, 2.0],
            },
            scoring: ScoringConfig {
                base_score_per_action: 100,
                accuracy_multiplier: 2.0,
                combo_multiplier_per_hit: 0.1,
                max_combo_multiplier: 5.0,
            },
            combo: ComboConfig {
                min_accuracy_for_combo: 0.7,
                combo_break_time_ms: 2000,
                max_combo: 999,
            },
        }
    }
    
    fn create_test_service() -> Arc<GameLogicConfig> {
        Arc::new(create_test_config())
    }
    
    #[test]
    fn test_calculate_damage_perfect_accuracy() {
        let config = create_test_service();
        let service = GameLogicService {
            config: config.clone(),
            logger: Arc::new(crate::services::core::QualiaLogger::default()),
            event_bus: Arc::new(crate::services::core::EventBusService::new(100)),
        };
        
        let damage = service.calculate_damage(1.0, 0);
        assert_eq!(damage, config.player.base_damage);
    }
    
    #[test]
    fn test_calculate_damage_with_combo() {
        let config = create_test_service();
        let service = GameLogicService {
            config: config.clone(),
            logger: Arc::new(crate::services::core::QualiaLogger::default()),
            event_bus: Arc::new(crate::services::core::EventBusService::new(100)),
        };
        
        // Combo of 10 → multiplier = 1 + (10 * 0.1) = 2.0x
        let damage = service.calculate_damage(1.0, 10);
        assert_eq!(damage, config.player.base_damage * 2.0);
    }
    
    #[test]
    fn test_calculate_damage_caps_at_max_multiplier() {
        let config = create_test_service();
        let service = GameLogicService {
            config: config.clone(),
            logger: Arc::new(crate::services::core::QualiaLogger::default()),
            event_bus: Arc::new(crate::services::core::EventBusService::new(100)),
        };
        
        // Combo of 100 should cap at max_combo_multiplier (5.0x)
        let damage = service.calculate_damage(1.0, 100);
        assert_eq!(damage, config.player.base_damage * config.scoring.max_combo_multiplier);
    }
    
    #[test]
    fn test_calculate_damage_zero_accuracy() {
        let config = create_test_service();
        let service = GameLogicService {
            config: config.clone(),
            logger: Arc::new(crate::services::core::QualiaLogger::default()),
            event_bus: Arc::new(crate::services::core::EventBusService::new(100)),
        };
        
        let damage = service.calculate_damage(0.0, 10);
        assert_eq!(damage, 0.0);
    }
    
    #[test]
    fn test_update_combo_success() {
        let config = create_test_service();
        let service = GameLogicService {
            config: config.clone(),
            logger: Arc::new(crate::services::core::QualiaLogger::default()),
            event_bus: Arc::new(crate::services::core::EventBusService::new(100)),
        };
        
        let new_combo = service.update_combo(5, true, 0.9);
        assert_eq!(new_combo, 6);
    }
    
    #[test]
    fn test_update_combo_failure_breaks_combo() {
        let config = create_test_service();
        let service = GameLogicService {
            config: config.clone(),
            logger: Arc::new(crate::services::core::QualiaLogger::default()),
            event_bus: Arc::new(crate::services::core::EventBusService::new(100)),
        };
        
        let new_combo = service.update_combo(10, false, 0.5);
        assert_eq!(new_combo, 0);
    }
    
    #[test]
    fn test_update_combo_low_accuracy_breaks_combo() {
        let config = create_test_service();
        let service = GameLogicService {
            config: config.clone(),
            logger: Arc::new(crate::services::core::QualiaLogger::default()),
            event_bus: Arc::new(crate::services::core::EventBusService::new(100)),
        };
        
        // Accuracy below min_accuracy_for_combo (0.7)
        let new_combo = service.update_combo(10, true, 0.6);
        assert_eq!(new_combo, 0);
    }
    
    #[test]
    fn test_update_combo_caps_at_max() {
        let config = create_test_service();
        let service = GameLogicService {
            config: config.clone(),
            logger: Arc::new(crate::services::core::QualiaLogger::default()),
            event_bus: Arc::new(crate::services::core::EventBusService::new(100)),
        };
        
        let new_combo = service.update_combo(config.combo.max_combo - 1, true, 1.0);
        assert_eq!(new_combo, config.combo.max_combo);
        
        // Should not exceed max_combo
        let capped_combo = service.update_combo(config.combo.max_combo, true, 1.0);
        assert_eq!(capped_combo, config.combo.max_combo);
    }
    
    #[test]
    fn test_calculate_score_perfect() {
        let config = create_test_service();
        let service = GameLogicService {
            config: config.clone(),
            logger: Arc::new(crate::services::core::QualiaLogger::default()),
            event_bus: Arc::new(crate::services::core::EventBusService::new(100)),
        };
        
        // base=100, accuracy=1.0, accuracy_mult=2.0, combo=0 → 100 * 1.0 * 2.0 * 1.0 = 200
        let score = service.calculate_score(100, 1.0, 0);
        assert_eq!(score, 200);
    }
    
    #[test]
    fn test_calculate_score_with_combo() {
        let config = create_test_service();
        let service = GameLogicService {
            config: config.clone(),
            logger: Arc::new(crate::services::core::QualiaLogger::default()),
            event_bus: Arc::new(crate::services::core::EventBusService::new(100)),
        };
        
        // base=100, accuracy=1.0, accuracy_mult=2.0, combo=10 (mult=2.0x) → 100 * 1.0 * 2.0 * 2.0 = 400
        let score = service.calculate_score(100, 1.0, 10);
        assert_eq!(score, 400);
    }
    
    #[test]
    fn test_calculate_score_zero_accuracy() {
        let config = create_test_service();
        let service = GameLogicService {
            config: config.clone(),
            logger: Arc::new(crate::services::core::QualiaLogger::default()),
            event_bus: Arc::new(crate::services::core::EventBusService::new(100)),
        };
        
        let score = service.calculate_score(100, 0.0, 10);
        assert_eq!(score, 0);
    }
    
    #[test]
    fn test_is_player_defeated() {
        let config = create_test_service();
        let service = GameLogicService {
            config: config.clone(),
            logger: Arc::new(crate::services::core::QualiaLogger::default()),
            event_bus: Arc::new(crate::services::core::EventBusService::new(100)),
        };
        
        let alive_player = PlayerState {
            health: 50.0,
            position: (0.0, 0.0),
            is_dashing: false,
            combo: 0,
        };
        assert!(!service.is_player_defeated(&alive_player));
        
        let dead_player = PlayerState {
            health: 0.0,
            position: (0.0, 0.0),
            is_dashing: false,
            combo: 0,
        };
        assert!(service.is_player_defeated(&dead_player));
    }
    
    #[test]
    fn test_is_boss_defeated() {
        let config = create_test_service();
        let service = GameLogicService {
            config: config.clone(),
            logger: Arc::new(crate::services::core::QualiaLogger::default()),
            event_bus: Arc::new(crate::services::core::EventBusService::new(100)),
        };
        
        let alive_boss = BossState {
            health: 500.0,
            position: (0.0, 10.0),
            current_phase: 2,
        };
        assert!(!service.is_boss_defeated(&alive_boss));
        
        let dead_boss = BossState {
            health: 0.0,
            position: (0.0, 10.0),
            current_phase: 3,
        };
        assert!(service.is_boss_defeated(&dead_boss));
    }
}
