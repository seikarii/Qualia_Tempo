//! # Responsibility
//! BossAIService implementation for boss behavior and attack pattern selection.
//!
//! ---
//!
//! Reacts to player qualia state changes and selects appropriate attack patterns
//! based on aggression level and current boss phase.

use shaku::Component;
use async_trait::async_trait;
use std::sync::Arc;
use anyhow::{Context, Result};
use tracing::info;

use crate::config::boss_ai::BossAIConfig;
use crate::services::interfaces::{IBossAIService, ILogger};
use shared_core::contracts::{QualiaState, BossState};
use shared_core::events::GameEvent;

/// # Responsibility
/// Implements boss AI for reactive attack pattern selection.
///
/// ---
///
/// This service:
/// - Monitors player qualia state (intensity, chaos, transcendence)
/// - Calculates boss aggression level dynamically
/// - Selects attack patterns based on aggression + phase
/// - Manages boss phase transitions (health thresholds)
///
/// Injected dependencies:
/// - BossAIConfig: AI behavior parameters
/// - ILogger: Structured logging
#[derive(Component)]
#[shaku(interface = IBossAIService)]
pub struct BossAIService {
    config: Arc<BossAIConfig>,
    
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,
}

#[async_trait]
impl IBossAIService for BossAIService {
    async fn decide_next_action(
        &self,
        qualia_state: &QualiaState,
        boss_state: &BossState,
    ) -> Result<GameEvent> {
        let aggression = self.calculate_aggression(qualia_state);
        let phase = boss_state.current_phase;
        
        // Select pattern based on aggression
        let pattern_id = if aggression > 0.7 {
            format!("aggressive_pattern_phase_{}", phase)
        } else if aggression > 0.4 {
            format!("moderate_pattern_phase_{}", phase)
        } else {
            format!("defensive_pattern_phase_{}", phase)
        };
        
        self.logger.info(&format!(
            "Boss decided action: pattern={}, aggression={:.2}, phase={}",
            pattern_id, aggression, phase
        ));
        
        Ok(GameEvent::BossActionSelected {
            pattern_id,
            aggression,
        })
    }
    
    fn calculate_aggression(&self, qualia_state: &QualiaState) -> f32 {
        // Aggression increases with player intensity and chaos
        let intensity_contrib = qualia_state.intensity * 0.4;
        let chaos_contrib = qualia_state.chaos * 0.3;
        let transcendence_contrib = qualia_state.transcendence * 0.3;
        
        let raw_aggression = self.config.base_aggression + intensity_contrib + chaos_contrib + transcendence_contrib;
        
        raw_aggression.clamp(0.0, 1.0)
    }
    
    fn should_transition_phase(&self, boss_state: &BossState) -> bool {
        // Phase transition happens at specific health thresholds
        // This is typically handled by CombatOrchestrator, but provided for reference
        let health_percentage = boss_state.health / 1000.0; // Assuming max health = 1000
        
        match boss_state.current_phase {
            0 => health_percentage < 0.75,
            1 => health_percentage < 0.5,
            2 => health_percentage < 0.25,
            _ => false,
        }
    }
    
    fn get_next_phase(&self, current_phase: u8) -> u8 {
        (current_phase + 1).min(3) // Max phase = 3 (0-indexed, 4 phases total)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::boss_ai::{BossAIConfig, PatternSelectionConfig};
    use shared_core::contracts::QualiaState;
    
    fn create_test_config() -> BossAIConfig {
        BossAIConfig {
            base_aggression: 0.3,
            aggression_per_phase: vec![1.0, 1.3, 1.6, 2.0],
            reaction_time_ms: 500,
            pattern_selection: PatternSelectionConfig {
                random_chance: 0.2,
                prefer_high_aggression_patterns: true,
                cooldown_between_patterns_ms: 3000,
            },
        }
    }
    
    fn create_test_service() -> BossAIService {
        BossAIService {
            config: Arc::new(create_test_config()),
            logger: Arc::new(crate::services::core::QualiaLogger::default()),
        }
    }
    
    #[test]
    fn test_calculate_aggression_low_qualia() {
        let service = create_test_service();
        let qualia = QualiaState {
            intensity: 0.0,
            harmony: 0.5,
            chaos: 0.0,
            kairos: 0.5,
            transcendence: 0.0,
            ..Default::default()
        };
        
        let aggression = service.calculate_aggression(&qualia);
        assert!(aggression >= 0.3 && aggression < 0.5); // Should be close to base_aggression
    }
    
    #[test]
    fn test_calculate_aggression_high_intensity() {
        let service = create_test_service();
        let qualia = QualiaState {
            intensity: 1.0,
            harmony: 0.5,
            chaos: 0.0,
            kairos: 0.5,
            transcendence: 0.0,
            ..Default::default()
        };
        
        let aggression = service.calculate_aggression(&qualia);
        assert!(aggression > 0.5); // Intensity contributes 40%
    }
    
    #[test]
    fn test_calculate_aggression_high_chaos() {
        let service = create_test_service();
        let qualia = QualiaState {
            intensity: 0.0,
            harmony: 0.5,
            chaos: 1.0,
            kairos: 0.5,
            transcendence: 0.0,
            ..Default::default()
        };
        
        let aggression = service.calculate_aggression(&qualia);
        assert!(aggression > 0.5); // Chaos contributes 30%
    }
    
    #[test]
    fn test_calculate_aggression_max_qualia() {
        let service = create_test_service();
        let qualia = QualiaState {
            intensity: 1.0,
            harmony: 1.0,
            chaos: 1.0,
            kairos: 1.0,
            transcendence: 1.0,
            ..Default::default()
        };
        
        let aggression = service.calculate_aggression(&qualia);
        assert_eq!(aggression, 1.0); // Should clamp at 1.0
    }
    
    #[test]
    fn test_calculate_aggression_clamped_to_range() {
        let service = create_test_service();
        let qualia = QualiaState::default(); // All zeros
        
        let aggression = service.calculate_aggression(&qualia);
        assert!(aggression >= 0.0 && aggression <= 1.0);
    }
    
    #[test]
    fn test_should_transition_phase_0_to_1() {
        let service = create_test_service();
        let boss_high_health = BossState {
            health: 800.0,
            position: (0.0, 10.0),
            current_phase: 0,
        };
        assert!(!service.should_transition_phase(&boss_high_health));
        
        let boss_low_health = BossState {
            health: 700.0, // < 75% of 1000
            position: (0.0, 10.0),
            current_phase: 0,
        };
        assert!(service.should_transition_phase(&boss_low_health));
    }
    
    #[test]
    fn test_should_transition_phase_1_to_2() {
        let service = create_test_service();
        let boss = BossState {
            health: 400.0, // < 50% of 1000
            position: (0.0, 10.0),
            current_phase: 1,
        };
        assert!(service.should_transition_phase(&boss));
    }
    
    #[test]
    fn test_should_transition_phase_final_phase() {
        let service = create_test_service();
        let boss = BossState {
            health: 100.0,
            position: (0.0, 10.0),
            current_phase: 3, // Final phase
        };
        assert!(!service.should_transition_phase(&boss)); // No transition from final phase
    }
    
    #[test]
    fn test_get_next_phase() {
        let service = create_test_service();
        assert_eq!(service.get_next_phase(0), 1);
        assert_eq!(service.get_next_phase(1), 2);
        assert_eq!(service.get_next_phase(2), 3);
        assert_eq!(service.get_next_phase(3), 3); // Caps at 3
        assert_eq!(service.get_next_phase(10), 3); // Caps at 3
    }
    
    #[tokio::test]
    async fn test_decide_next_action_aggressive() {
        let service = create_test_service();
        let high_qualia = QualiaState {
            intensity: 1.0,
            harmony: 0.5,
            chaos: 1.0,
            kairos: 0.5,
            transcendence: 1.0,
            ..Default::default()
        };
        let boss = BossState {
            health: 500.0,
            position: (0.0, 10.0),
            current_phase: 2,
        };
        
        let result = service.decide_next_action(&high_qualia, &boss).await;
        assert!(result.is_ok());
        
        if let Ok(GameEvent::BossActionSelected { pattern_id, aggression }) = result {
            assert!(pattern_id.contains("aggressive"));
            assert!(pattern_id.contains("phase_2"));
            assert!(aggression > 0.7);
        } else {
            panic!("Expected BossActionSelected event");
        }
    }
    
    #[tokio::test]
    async fn test_decide_next_action_defensive() {
        let service = create_test_service();
        let low_qualia = QualiaState::default(); // All zeros
        let boss = BossState {
            health: 900.0,
            position: (0.0, 10.0),
            current_phase: 0,
        };
        
        let result = service.decide_next_action(&low_qualia, &boss).await;
        assert!(result.is_ok());
        
        if let Ok(GameEvent::BossActionSelected { pattern_id, .. }) = result {
            assert!(pattern_id.contains("defensive"));
            assert!(pattern_id.contains("phase_0"));
        } else {
            panic!("Expected BossActionSelected event");
        }
    }
}
