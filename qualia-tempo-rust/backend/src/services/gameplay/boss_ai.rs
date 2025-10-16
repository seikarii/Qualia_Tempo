//! # Responsibility
//! Implements reactive boss AI that responds to player actions and qualia changes.
//!
//! ---
//!
//! This service subscribes to the EventBus and reacts to player performance.
//! It selects attack patterns based on current game phase, player qualia state,
//! and its own aggression level. Implements the reactive AI pattern from GDD.md.

use shaku::{Component, Interface};
use std::sync::Arc;
use async_trait::async_trait;
use anyhow::Result;
use tokio::sync::broadcast;
use shared_core::{
    contracts::{
        QualiaState,
        game_state::BossState,
        combat_data::{PatternData, PatternShape, PatternElement},
    },
    events::{GameEvent, combat_events::BossAttackStartEvent},
};
use super::state_store::IStateStore;
use crate::services::infrastructure::{ILogger, IEventBus};
use crate::config::BossAIConfig;

/// # Responsibility
/// Interface for boss AI operations.
#[async_trait]
pub trait IBossAIService: Interface {
    /// Starts the boss AI event loop
    async fn start(&self) -> Result<()>;
    
    /// Selects the next attack pattern based on current state
    fn select_attack_pattern(&self, boss: &BossState, qualia: &QualiaState) -> PatternData;
    
    /// Calculates aggression level based on qualia chaos
    fn calculate_aggression(&self, qualia: &QualiaState) -> f32;
}

/// # Responsibility
/// Implements reactive boss AI with pattern selection and aggression scaling.
#[derive(Component)]
#[shaku(interface = IBossAIService)]
pub struct BossAIService {
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,
    
    #[shaku(inject)]
    event_bus: Arc<dyn IEventBus>,
    
    #[shaku(inject)]
    state_store: Arc<dyn IStateStore>,
    
    config: Arc<BossAIConfig>,
}

impl BossAIService {
    /// Creates a sample attack pattern for testing
    fn create_sample_pattern(&self, phase: u32, aggression: f32) -> PatternData {
        let shape = if aggression > 0.7 {
            PatternShape::Spiral
        } else if aggression > 0.4 {
            PatternShape::Wave
        } else {
            PatternShape::Circle
        };
        
        let element = match phase {
            0 => PatternElement::Fire,
            1 => PatternElement::Lightning,
            2 => PatternElement::Void,
            _ => PatternElement::Chaos,
        };
        
        PatternData {
            id: format!("pattern_phase{}_agg{}", phase, (aggression * 10.0) as u32),
            name: format!("{:?} {:?} Pattern", element, shape),  // Use Debug format for both
            shape,
            element,
            duration_sec: 3.0 + (aggression * 2.0) as f64,
            telegraph_duration_sec: 1.0 - (aggression * 0.3) as f64,
            projectile_count: 5 + (aggression * 15.0) as u32,
            projectile_speed: 5.0 + (aggression * 10.0),
            damage: 10.0 + (aggression * 20.0),
            required_phase: phase as u8,
        }
    }
}

#[async_trait]
impl IBossAIService for BossAIService {
    async fn start(&self) -> Result<()> {
        self.logger.info("BossAIService starting event loop");
        
        let event_bus = self.event_bus.clone();
        let state_store = self.state_store.clone();
        let logger = self.logger.clone();
        let config = self.config.clone();
        
        let service_clone = Self {
            logger: logger.clone(),
            event_bus: event_bus.clone(),
            state_store: state_store.clone(),
            config: config.clone(),
        };
        
        tokio::spawn(async move {
            let mut events = event_bus.subscribe();
            logger.info("BossAI subscribed to EventBus");
            
            loop {
                match events.recv().await {
                    Ok(GameEvent::QualiaStateUpdated(qualia)) => {
                        // React to qualia changes
                        let aggression = service_clone.calculate_aggression(&qualia);
                        
                        // Update boss aggression in state
                        let mut boss = state_store.get_state().boss;
                        boss.current_aggression_level = aggression;
                        state_store.update_boss(boss.clone());
                        
                        // Randomly trigger attack based on aggression
                        if rand::random::<f32>() < aggression * 0.1 {
                            let pattern = service_clone.select_attack_pattern(&boss, &qualia);
                            
                            let attack_event = GameEvent::Combat(
                                shared_core::events::combat_events::CombatEvent::BossAttackStart(
                                    BossAttackStartEvent {
                                        pattern_id: pattern.id.clone(),
                                        pattern_name: pattern.name.clone(),
                                        telegraph_duration_sec: pattern.telegraph_duration_sec,
                                        spawn_position: boss.position,
                                        timestamp: 0.0, // TODO: Use proper timestamp
                                    }
                                )
                            );
                            
                            let _ = event_bus.emit(attack_event);
                        }
                    }
                    Ok(GameEvent::PlayerAction(_)) => {
                        // React to player actions if needed
                    }
                    Err(broadcast::error::RecvError::Lagged(skipped)) => {
                        logger.warn(&format!("BossAI lagging! Skipped {} events", skipped));
                    }
                    Err(broadcast::error::RecvError::Closed) => {
                        logger.info("EventBus closed, BossAI stopping");
                        break;
                    }
                    _ => {}
                }
            }
        });
        
        Ok(())
    }
    
    fn select_attack_pattern(&self, boss: &BossState, qualia: &QualiaState) -> PatternData {
        // Select pattern based on boss phase and player qualia
        let phase = boss.current_phase;
        let aggression = self.calculate_aggression(qualia);
        
        // TODO: Load patterns from CombatData configuration
        // For now, generate a sample pattern
        self.create_sample_pattern(phase, aggression)
    }
    
    fn calculate_aggression(&self, qualia: &QualiaState) -> f32 {
        // Aggression increases with player chaos and intensity
        let chaos_factor = qualia.chaos * self.config.chaos_aggression_multiplier;
        let intensity_factor = qualia.intensity * self.config.intensity_aggression_multiplier;
        
        ((chaos_factor + intensity_factor) / 2.0).clamp(0.0, 1.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::infrastructure::{QualiaLogger, EventBusService};
    use crate::services::gameplay::StateStoreService;
    use shared_core::utils::math::Vector2;

    fn create_test_service() -> BossAIService {
        let logger = Arc::new(QualiaLogger) as Arc<dyn ILogger>;
        let event_bus = Arc::new(EventBusService::new(100)) as Arc<dyn IEventBus>;
        let state_store = Arc::new(StateStoreService::new()) as Arc<dyn IStateStore>;
        let config = Arc::new(BossAIConfig::default());
        
        BossAIService {
            logger,
            event_bus,
            state_store,
            config,
        }
    }

    #[test]
    fn test_calculate_aggression_high_chaos() {
        let service = create_test_service();
        
        let mut qualia = QualiaState::default();
        qualia.chaos = 0.8;
        qualia.intensity = 0.6;
        
        let aggression = service.calculate_aggression(&qualia);
        
        assert!(aggression > 0.5, "High chaos should increase aggression");
        assert!(aggression <= 1.0, "Aggression should be clamped to 1.0");
    }

    #[test]
    fn test_calculate_aggression_low_chaos() {
        let service = create_test_service();
        
        let mut qualia = QualiaState::default();
        qualia.chaos = 0.1;
        qualia.intensity = 0.2;
        
        let aggression = service.calculate_aggression(&qualia);
        
        assert!(aggression < 0.3, "Low chaos should result in low aggression");
    }

    #[test]
    fn test_select_attack_pattern_scales_with_aggression() {
        let service = create_test_service();
        
        let boss = BossState::default();
        let mut qualia = QualiaState::default();
        qualia.chaos = 0.9;
        qualia.intensity = 0.9;
        
        let pattern = service.select_attack_pattern(&boss, &qualia);
        
        // High aggression should produce more dangerous patterns
        assert!(pattern.projectile_count > 10, "High aggression should spawn more projectiles");
        assert!(pattern.damage > 15.0, "High aggression should deal more damage");
    }

    #[tokio::test]
    async fn test_boss_ai_starts_without_panic() {
        let service = create_test_service();
        
        let result = service.start().await;
        assert!(result.is_ok(), "BossAI should start successfully");
        
        // Give it a moment to initialize
        tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
    }
}
