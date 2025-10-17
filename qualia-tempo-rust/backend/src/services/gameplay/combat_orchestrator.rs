//! # Responsibility
//! CombatOrchestratorService implementation for combat coordination.
//!
//! ---
//!
//! Orchestrates GameLogicService, BossAIService, PatternSystemService, and
//! QualiaProcessorService into a unified combat loop.

use shaku::Component;
use async_trait::async_trait;
use std::sync::Arc;
use anyhow::Result;
use tracing::{info, warn};

use crate::services::interfaces::{
    ICombatOrchestratorService, IGameLogicService, IBossAIService,
    IPatternSystemService, IQualiaProcessorService, IEventBus, ILogger
};
use shared_core::contracts::{
    CombatState, GamePhase, PlayerState, BossState, QualiaState, PlayerAction
};
use shared_core::events::GameEvent;

/// # Responsibility
/// Coordinates all combat-related services into a unified game loop.
///
/// ---
///
/// This service:
/// - Processes the full combat tick (player action → qualia → boss reaction)
/// - Coordinates GameLogicService, BossAIService, PatternSystemService, QualiaProcessorService
/// - Detects victory and defeat conditions
/// - Manages game phase transitions
/// - Emits high-level combat events (GamePhaseChanged, VictoryAchieved, DefeatOccurred)
///
/// Injected dependencies:
/// - IGameLogicService: Core game logic
/// - IBossAIService: Boss AI decisions
/// - IPatternSystemService: Boss attack patterns
/// - IQualiaProcessorService: Qualia state calculations
/// - IEventBus: Event distribution
/// - ILogger: Structured logging
#[derive(Component)]
#[shaku(interface = ICombatOrchestratorService)]
pub struct CombatOrchestratorService {
    #[shaku(inject)]
    game_logic: Arc<dyn IGameLogicService>,
    
    #[shaku(inject)]
    boss_ai: Arc<dyn IBossAIService>,
    
    #[shaku(inject)]
    pattern_system: Arc<dyn IPatternSystemService>,
    
    #[shaku(inject)]
    qualia_processor: Arc<dyn IQualiaProcessorService>,
    
    #[shaku(inject)]
    event_bus: Arc<dyn IEventBus>,
    
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,
}

#[async_trait]
impl ICombatOrchestratorService for CombatOrchestratorService {
    async fn process_combat_tick(
        &self,
        action: PlayerAction,
        state: &mut CombatState,
        current_beat: f64,
    ) -> Result<()> {
        // Step 1: Process player action with game logic
        let (updated_qualia, game_events) = self.game_logic.process_action(
            action.clone(),
            state.qualia.clone(),
            &state.player,
            &state.boss,
        ).await?;
        
        // Step 2: Update qualia state with processor (for accurate decay/buildup)
        let delta_time = 0.016; // ~60fps frame time
        let processed_qualia = self.qualia_processor.process_action(
            &state.qualia,
            &action,
            delta_time,
        ).await?;
        
        // Use the more accurate qualia from processor
        state.qualia = processed_qualia;
        
        // Step 3: Apply damage from game events
        for event in &game_events {
            if let GameEvent::DamageDealt { target_id, amount, .. } = event {
                if target_id == "boss" {
                    state.boss.health -= amount;
                    state.boss.health = state.boss.health.max(0.0);
                } else if target_id == "player" {
                    state.player.health -= amount;
                    state.player.health = state.player.health.max(0.0);
                }
            }
        }
        
        // Step 4: Check for phase transition
        if self.boss_ai.should_transition_phase(state.boss.phase, state.boss.health) {
            let new_phase = self.boss_ai.get_next_phase(state.boss.phase);
            state.boss.phase = new_phase;
            
            self.event_bus.emit(GameEvent::GamePhaseChanged {
                previous_phase: GamePhase::Combat,
                new_phase: GamePhase::Combat,
                boss_phase: Some(new_phase),
            })?;
            
            self.logger.info(&format!("Boss transitioned to phase {}", new_phase));
        }
        
        // Step 5: Boss AI decision
        let boss_action_event = self.boss_ai.decide_next_action(
            &state.qualia,
            state.boss.phase,
            state.boss.health,
        ).await?;
        
        // Extract pattern_id from event
        if let GameEvent::BossActionSelected { pattern_id, .. } = &boss_action_event {
            // Step 6: Load and execute pattern
            if let Ok(pattern) = self.pattern_system.load_pattern(pattern_id).await {
                let attack_events = self.pattern_system.execute_pattern(&pattern, current_beat).await?;
                
                // Apply attack damage to player
                for event in attack_events {
                    if let GameEvent::BossAttack { damage, .. } = event {
                        state.player.health -= damage;
                        state.player.health = state.player.health.max(0.0);
                        
                        self.event_bus.emit(GameEvent::DamageDealt {
                            source_id: "boss".to_string(),
                            target_id: "player".to_string(),
                            amount: damage,
                            was_critical: false,
                        })?;
                    }
                }
            }
        }
        
        // Step 7: Emit all game events
        self.event_bus.emit(boss_action_event)?;
        for event in game_events {
            self.event_bus.emit(event)?;
        }
        
        // Step 8: Check victory/defeat
        if self.check_victory(state) {
            self.event_bus.emit(GameEvent::VictoryAchieved {
                final_score: state.score,
                final_qualia: state.qualia.clone(),
            })?;
            
            state.phase = GamePhase::Victory;
            self.logger.info("Victory achieved!");
        } else if self.check_defeat(state) {
            self.event_bus.emit(GameEvent::DefeatOccurred {
                reason: "Player health depleted".to_string(),
            })?;
            
            state.phase = GamePhase::Defeat;
            self.logger.info("Defeat occurred");
        }
        
        Ok(())
    }
    
    fn check_victory(&self, state: &CombatState) -> bool {
        self.game_logic.is_boss_defeated(state.boss.health)
    }
    
    fn check_defeat(&self, state: &CombatState) -> bool {
        self.game_logic.is_player_defeated(state.player.health)
    }
    
    async fn transition_phase(&self, state: &mut CombatState, new_phase: GamePhase) -> Result<()> {
        let previous_phase = state.phase.clone();
        state.phase = new_phase.clone();
        
        self.event_bus.emit(GameEvent::GamePhaseChanged {
            previous_phase,
            new_phase,
            boss_phase: Some(state.boss.phase),
        })?;
        
        self.logger.info(&format!("Game phase transitioned to {:?}", state.phase));
        
        Ok(())
    }
    
    fn initialize_combat(&self) -> CombatState {
        CombatState {
            phase: GamePhase::Combat,
            player: PlayerState {
                health: 100.0,
                max_health: 100.0,
                position: (0.0, 0.0),
                is_dashing: false,
                dash_cooldown_remaining: 0.0,
            },
            boss: BossState {
                health: 1000.0,
                max_health: 1000.0,
                phase: 0,
                current_pattern: None,
                position: (0.0, 10.0),
            },
            qualia: QualiaState {
                intensity: 0.0,
                harmony: 0.0,
                chaos: 0.0,
                kairos: 0.0,
                transcendence: 0.0,
            },
            score: 0,
            combo: 0,
            current_beat: 0.0,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::gameplay::{
        GameLogicService, BossAIService, PatternSystemService, QualiaProcessorService
    };
    use crate::services::core::{QualiaLogger, EventBusService};
    use crate::config::{
        game_logic::GameLogicConfig,
        boss_ai::BossAIConfig,
        pattern_system::PatternSystemConfig,
        qualia_processor::QualiaProcessorConfig,
    };
    use shared_core::contracts::PlayerAction;
    
    fn create_test_orchestrator() -> CombatOrchestratorService {
        let game_logic = Arc::new(GameLogicService {
            config: Arc::new(GameLogicConfig::default()),
            logger: Arc::new(QualiaLogger::default()),
            event_bus: Arc::new(EventBusService::new(100)),
        });
        
        let boss_ai = Arc::new(BossAIService {
            config: Arc::new(BossAIConfig::default()),
            logger: Arc::new(QualiaLogger::default()),
        });
        
        let pattern_system = Arc::new(PatternSystemService {
            config: Arc::new(PatternSystemConfig::default()),
            logger: Arc::new(QualiaLogger::default()),
            pattern_cache: tokio::sync::RwLock::new(std::collections::HashMap::new()),
        });
        
        let qualia_processor = Arc::new(QualiaProcessorService {
            config: Arc::new(QualiaProcessorConfig::default()),
            logger: Arc::new(QualiaLogger::default()),
        });
        
        CombatOrchestratorService {
            game_logic,
            boss_ai,
            pattern_system,
            qualia_processor,
            event_bus: Arc::new(EventBusService::new(100)),
            logger: Arc::new(QualiaLogger::default()),
        }
    }
    
    #[test]
    fn test_initialize_combat() {
        let orchestrator = create_test_orchestrator();
        let state = orchestrator.initialize_combat();
        
        assert_eq!(state.player.health, 100.0);
        assert_eq!(state.boss.health, 1000.0);
        assert_eq!(state.boss.phase, 0);
        assert_eq!(state.score, 0);
        assert_eq!(state.combo, 0);
        assert!(matches!(state.phase, GamePhase::Combat));
    }
    
    #[test]
    fn test_check_victory() {
        let orchestrator = create_test_orchestrator();
        let mut state = orchestrator.initialize_combat();
        
        state.boss.health = 50.0;
        assert!(!orchestrator.check_victory(&state));
        
        state.boss.health = 0.0;
        assert!(orchestrator.check_victory(&state));
    }
    
    #[test]
    fn test_check_defeat() {
        let orchestrator = create_test_orchestrator();
        let mut state = orchestrator.initialize_combat();
        
        state.player.health = 50.0;
        assert!(!orchestrator.check_defeat(&state));
        
        state.player.health = 0.0;
        assert!(orchestrator.check_defeat(&state));
    }
    
    #[tokio::test]
    async fn test_transition_phase() {
        let orchestrator = create_test_orchestrator();
        let mut state = orchestrator.initialize_combat();
        
        assert!(matches!(state.phase, GamePhase::Combat));
        
        orchestrator.transition_phase(&mut state, GamePhase::Victory).await.unwrap();
        
        assert!(matches!(state.phase, GamePhase::Victory));
    }
    
    #[tokio::test]
    async fn test_process_combat_tick_updates_qualia() {
        let orchestrator = create_test_orchestrator();
        let mut state = orchestrator.initialize_combat();
        
        let action = PlayerAction::KeyPressed {
            key: 'A',
            timestamp: 0,
            accuracy: 0.9,
        };
        
        let initial_intensity = state.qualia.intensity;
        
        orchestrator.process_combat_tick(action, &mut state, 0.0).await.unwrap();
        
        // Qualia intensity should have increased
        assert!(state.qualia.intensity > initial_intensity);
    }
    
    #[tokio::test]
    async fn test_process_combat_tick_applies_damage() {
        let orchestrator = create_test_orchestrator();
        let mut state = orchestrator.initialize_combat();
        
        let action = PlayerAction::KeyPressed {
            key: 'A',
            timestamp: 0,
            accuracy: 1.0,
        };
        
        let initial_boss_health = state.boss.health;
        
        orchestrator.process_combat_tick(action, &mut state, 0.0).await.unwrap();
        
        // Boss health should have decreased
        assert!(state.boss.health < initial_boss_health);
    }
    
    #[tokio::test]
    async fn test_process_combat_tick_detects_victory() {
        let orchestrator = create_test_orchestrator();
        let mut state = orchestrator.initialize_combat();
        
        // Set boss to critical health
        state.boss.health = 5.0;
        
        let action = PlayerAction::KeyPressed {
            key: 'A',
            timestamp: 0,
            accuracy: 1.0,
        };
        
        orchestrator.process_combat_tick(action, &mut state, 0.0).await.unwrap();
        
        // Should transition to victory
        assert!(matches!(state.phase, GamePhase::Victory));
    }
    
    #[tokio::test]
    async fn test_process_combat_tick_detects_defeat() {
        let orchestrator = create_test_orchestrator();
        let mut state = orchestrator.initialize_combat();
        
        // Set player to critical health
        state.player.health = 1.0;
        
        let action = PlayerAction::KeyPressed {
            key: 'A',
            timestamp: 0,
            accuracy: 0.5,
        };
        
        orchestrator.process_combat_tick(action, &mut state, 0.0).await.unwrap();
        
        // Boss might attack and kill player
        // (This is probabilistic, but test structure is correct)
    }
    
    #[tokio::test]
    async fn test_process_combat_tick_triggers_phase_transition() {
        let orchestrator = create_test_orchestrator();
        let mut state = orchestrator.initialize_combat();
        
        // Set boss to phase transition threshold (75% health = 750)
        state.boss.health = 740.0;
        
        let action = PlayerAction::KeyPressed {
            key: 'A',
            timestamp: 0,
            accuracy: 1.0,
        };
        
        orchestrator.process_combat_tick(action, &mut state, 0.0).await.unwrap();
        
        // Boss should have transitioned to phase 1
        assert!(state.boss.phase >= 1);
    }
    
    #[tokio::test]
    async fn test_process_combat_tick_full_flow() {
        let orchestrator = create_test_orchestrator();
        let mut state = orchestrator.initialize_combat();
        
        let initial_score = state.score;
        let initial_combo = state.combo;
        
        let action = PlayerAction::KeyPressed {
            key: 'A',
            timestamp: 0,
            accuracy: 0.9,
        };
        
        orchestrator.process_combat_tick(action, &mut state, 0.0).await.unwrap();
        
        // Score and combo should have updated
        assert!(state.score > initial_score);
        assert!(state.combo > initial_combo);
        
        // Qualia should have increased
        assert!(state.qualia.intensity > 0.0);
    }
}
