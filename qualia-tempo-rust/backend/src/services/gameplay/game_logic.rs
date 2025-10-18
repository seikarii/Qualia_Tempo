//! # Responsibility
//! Implements core game logic: qualia calculation, health, combos, victory/failure conditions.
//!
//! ---
//!
//! This is the brain of Qualia Tempo. It processes player actions, calculates qualia state
//! transitions, validates game rules, and emits state update events via the EventBus.

use crate::config::GameLogicConfig;
use crate::services::interfaces::{IEventBus, IGameLogicService, ILogger};
use anyhow::Result;
use async_trait::async_trait;
use shaku::Component;
use shared_core::contracts::{BossState, CombatState, GameStatus, PlayerAbilities, PlayerAction, PlayerState, QualiaState};
use shared_core::events::GameEvent;
use std::sync::{Arc, Mutex};
use tracing::{info, instrument};

/// # Responsibility
/// Processes player actions and calculates game state updates.
///
/// ---
///
/// Maintains internal game state (score, combo, player/boss health) and calculates
/// `QualiaState` transitions based on player actions. Emits state update events.
#[derive(Component)]
#[shaku(interface = IGameLogicService)]
pub struct GameLogicService {
    config: Arc<GameLogicConfig>,

    #[shaku(inject)]
    logger: Arc<dyn ILogger>,

    #[shaku(inject)]
    event_bus: Arc<dyn IEventBus>,

    /// Internal mutable state (wrapped in Mutex for interior mutability)
    state: Arc<Mutex<InternalGameState>>,
}

/// # Responsibility
/// Internal mutable game state not exposed to external services.
pub struct InternalGameState {
    score: u32,
    combo: u32,
    player_health: f32,
    boss_health: f32,
    last_qualia_state: QualiaState,
}

impl Default for InternalGameState {
    fn default() -> Self {
        Self {
            score: 0,
            combo: 0,
            player_health: 100.0,
            boss_health: 100.0,
            last_qualia_state: QualiaState::default(),
        }
    }
}

#[async_trait]
impl IGameLogicService for GameLogicService {
    #[instrument(skip(self))]
    async fn process_action(&self, action: PlayerAction) -> Result<QualiaState> {
        info!("Processing player action: {:?}", action);

        // Calculate new qualia state based on action
        let new_state = match action {
            PlayerAction::KeyPressed {
                accuracy,
                timestamp,
                ..
            } => {
                let mut state = self.state.lock().expect("GameLogicService: Failed to acquire state lock");
                self.calculate_qualia_from_accuracy(accuracy, timestamp, &mut state)
            }
            PlayerAction::Dash { timestamp, .. } => {
                self.apply_dash_bonus(timestamp)
            }
            PlayerAction::Parry { timestamp } => {
                self.apply_parry_bonus(timestamp)
            }
            PlayerAction::ActivateUltimate { timestamp } => {
                self.apply_ultimate_activation(timestamp)
            }
            PlayerAction::DeactivateUltimate { timestamp } => {
                self.apply_ultimate_deactivation(timestamp)
            }
            PlayerAction::Move { .. } => {
                // Movement doesn't affect qualia state
                return Ok(self.state.lock().expect("GameLogicService: Failed to acquire state lock for Move").last_qualia_state);
            }
        };

        // Update internal state
        {
            let mut state = self.state.lock().expect("GameLogicService: Failed to acquire state lock for update");
            state.last_qualia_state = new_state;
        }

        // Emit event via broadcast
        match self.event_bus.emit(GameEvent::QualiaStateUpdated {
            state: new_state,
        }) {
            Ok(count) => info!("Qualia state event sent to {} subscribers", count),
            Err(e) => self.logger.warn(&format!("No subscribers for qualia event: {:?}", e)),
        }

        Ok(new_state)
    }

    #[instrument(skip(self))]
    async fn update_game_state(&self, dt: f32) -> Result<CombatState> {
        // Apply time-based decay to qualia
        let mut internal_state = self.state.lock().expect("GameLogicService: Failed to acquire state lock for update_game_state");
        internal_state.last_qualia_state = self.apply_time_decay(
            internal_state.last_qualia_state,
            dt,
        );

        // Build combat state snapshot
        let combat_state = CombatState {
            game_state: if internal_state.player_health <= 0.0 {
                GameStatus::GameOver
            } else if internal_state.boss_health <= 0.0 {
                GameStatus::Victory
            } else {
                GameStatus::InCombat
            },
            player: PlayerState {
                position: shared_core::utils::Vec2::new(0.0, 0.0),
                velocity: shared_core::utils::Vec2::new(0.0, 0.0),
                health: internal_state.player_health,
                max_health: 100.0,
                abilities: PlayerAbilities::default(),
                is_invulnerable: false,
                combo_count: internal_state.combo,
                buffs: vec![],
                debuffs: vec![],
            },
            boss: BossState {
                id: "boss_1".to_string(),
                name: "The Conductor".to_string(),
                position: shared_core::utils::Vec2::new(0.0, 0.0),
                health: internal_state.boss_health,
                max_health: 100.0,
                is_vulnerable: true,
                phase: 1,
                current_aggression_level: 0.5,
            },
            qualia: internal_state.last_qualia_state,
            timestamp: chrono::Utc::now().timestamp_millis() as f64, // Precision loss acceptable for game timestamps
            elapsed_time: 0.0, // TODO: Track elapsed time
            score: internal_state.score,
            qualia_event_history: vec![],
        };

        Ok(combat_state)
    }

    fn get_current_score(&self) -> u32 {
        self.state.lock().expect("GameLogicService: Failed to acquire state lock for get_current_score").score
    }

    fn is_player_defeated(&self) -> bool {
        self.state.lock().expect("GameLogicService: Failed to acquire state lock for is_player_defeated").player_health <= 0.0
    }

    fn is_boss_defeated(&self) -> bool {
        self.state.lock().expect("GameLogicService: Failed to acquire state lock for is_boss_defeated").boss_health <= 0.0
    }
}

impl GameLogicService {
    /// Calculate qualia state from key press accuracy
    fn calculate_qualia_from_accuracy(
        &self,
        accuracy: f32,
        timestamp: f64,
        state: &mut InternalGameState,
    ) -> QualiaState {
        // Update combo
        if accuracy >= 0.8 {
            state.combo = (state.combo + 1).min(self.config.max_combo);
        } else {
            state.combo = 0;
        }

        // Calculate score (using checked operations to prevent overflow)
        let base_score = (accuracy * 100.0).clamp(0.0, 65535.0) as u32;
        let combo_bonus = if state.combo >= self.config.combo_threshold {
            let bonus_f32 = (base_score as f64) * f64::from(self.config.combo_multiplier);
            bonus_f32.clamp(0.0, 65535.0) as u32
        } else {
            base_score
        };
        state.score = state.score.saturating_add(combo_bonus);

        // Calculate qualia values
        let intensity = (accuracy * self.config.base_intensity_multiplier).clamp(0.0, 1.0);
        let precision = accuracy.clamp(0.0, 1.0);
        let flow = if state.combo >= self.config.combo_threshold {
            (accuracy * 1.2).clamp(0.0, 1.0)
        } else {
            (accuracy * 0.8).clamp(0.0, 1.0)
        };
        let chaos = ((1.0 - accuracy) * 0.5).clamp(0.0, 1.0);

        QualiaState {
            intensity,
            precision,
            aggression: 0.0,
            flow,
            chaos,
            recovery: 0.0,
            transcendence: 0.0,
            collection_window_end: timestamp + 1000.0,
        }
    }

    /// Apply dash bonus to qualia state
    fn apply_dash_bonus(&self, timestamp: f64) -> QualiaState {
        QualiaState {
            intensity: 0.7,
            precision: 0.5,
            aggression: 0.9,
            flow: 0.6,
            chaos: 0.2,
            recovery: 0.0,
            transcendence: 0.0,
            collection_window_end: timestamp + 1000.0,
        }
    }

    /// Apply parry bonus to qualia state
    fn apply_parry_bonus(&self, timestamp: f64) -> QualiaState {
        QualiaState {
            intensity: 0.8,
            precision: 0.95,
            aggression: 0.3,
            flow: 0.9,
            chaos: 0.1,
            recovery: 0.0,
            transcendence: 0.0,
            collection_window_end: timestamp + 1000.0,
        }
    }

    /// Apply ultimate activation
    fn apply_ultimate_activation(&self, timestamp: f64) -> QualiaState {
        QualiaState {
            intensity: 1.0,
            precision: 0.9,
            aggression: 0.8,
            flow: 1.0,
            chaos: 0.0,
            recovery: 0.0,
            transcendence: 1.0,
            collection_window_end: timestamp + 1000.0,
        }
    }

    /// Apply ultimate deactivation
    fn apply_ultimate_deactivation(&self, timestamp: f64) -> QualiaState {
        let mut state = self.state.lock().expect("GameLogicService: Failed to acquire state lock for ultimate deactivation").last_qualia_state;
        state.transcendence = 0.0;
        state.collection_window_end = timestamp + 1000.0;
        state
    }

    /// Apply time-based decay to qualia values
    fn apply_time_decay(&self, mut state: QualiaState, dt: f32) -> QualiaState {
        let decay = self.config.harmony_decay_rate * dt;
        
        state.intensity = (state.intensity - decay).max(0.0);
        state.precision = (state.precision - decay).max(0.0);
        state.flow = (state.flow - decay).max(0.0);
        state.chaos = (state.chaos + decay * 0.5).min(1.0);
        
        state
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::tests::mocks::{MockEventBus, MockLogger};

    fn create_test_service() -> GameLogicService {
        let config = Arc::new(GameLogicConfig::default());
        
        let mut logger = MockLogger::new();
        logger.expect_info().return_const(());
        logger.expect_warn().return_const(());
        logger.expect_error().return_const(());
        logger.expect_debug().return_const(());
        
        let mut event_bus = MockEventBus::new();
        event_bus.expect_emit().returning(|_| Ok(1));
        event_bus.expect_subscribe().returning(|| {
            let (_tx, rx) = tokio::sync::broadcast::channel(100);
            rx
        });
        
        let state = Arc::new(Mutex::new(InternalGameState::default()));

        GameLogicService {
            config,
            logger: Arc::new(logger),
            event_bus: Arc::new(event_bus),
            state,
        }
    }

    #[tokio::test]
    async fn test_process_high_accuracy_increases_intensity() {
        let service = create_test_service();

        let action = PlayerAction::KeyPressed {
            key: 'Q',
            timestamp: 1000.0,
            accuracy: 0.95,
        };

        let result = service.process_action(action).await;

        assert!(result.is_ok());
        let state = result.unwrap();
        assert!(state.intensity > 0.8, "High accuracy should yield high intensity");
        assert_eq!(state.precision, 0.95);
    }

    #[tokio::test]
    async fn test_process_low_accuracy_increases_chaos() {
        let service = create_test_service();

        let action = PlayerAction::KeyPressed {
            key: 'Q',
            timestamp: 1000.0,
            accuracy: 0.2,
        };

        let result = service.process_action(action).await;

        assert!(result.is_ok());
        let state = result.unwrap();
        assert!(state.chaos > 0.3, "Low accuracy should increase chaos");
        assert!(state.intensity < 0.5);
    }

    #[tokio::test]
    async fn test_combo_increases_score() {
        let service = create_test_service();

        // Hit 5 notes with high accuracy to build combo
        for _ in 0..5 {
            let action = PlayerAction::KeyPressed {
                key: 'Q',
                timestamp: 1000.0,
                accuracy: 0.9,
            };
            service.process_action(action).await.unwrap();
        }

        let score = service.get_current_score();
        assert!(score > 0, "Score should increase with successful hits");
    }

    #[tokio::test]
    async fn test_dash_sets_high_aggression() {
        let service = create_test_service();

        let action = PlayerAction::Dash {
            direction: shared_core::utils::Vec2::new(1.0, 0.0),
            timestamp: 2000.0,
        };

        let result = service.process_action(action).await;

        assert!(result.is_ok());
        let state = result.unwrap();
        assert!(state.aggression > 0.8, "Dash should set high aggression");
    }

    #[tokio::test]
    async fn test_ultimate_sets_transcendence() {
        let service = create_test_service();

        let action = PlayerAction::ActivateUltimate { timestamp: 3000.0 };

        let result = service.process_action(action).await;

        assert!(result.is_ok());
        let state = result.unwrap();
        assert_eq!(state.transcendence, 1.0, "Ultimate should set transcendence to 1.0");
        assert_eq!(state.intensity, 1.0);
    }

    #[test]
    fn test_qualia_values_clamped_to_valid_range() {
        let service = create_test_service();
        let mut internal_state = InternalGameState::default();

        let state = service.calculate_qualia_from_accuracy(1.5, 1000.0, &mut internal_state);

        // All values should be in [0.0, 1.0]
        assert!(state.intensity >= 0.0 && state.intensity <= 1.0);
        assert!(state.precision >= 0.0 && state.precision <= 1.0);
        assert!(state.flow >= 0.0 && state.flow <= 1.0);
        assert!(state.chaos >= 0.0 && state.chaos <= 1.0);
    }

    #[test]
    fn test_time_decay_reduces_intensity() {
        let service = create_test_service();

        let initial_state = QualiaState {
            intensity: 0.8,
            precision: 0.7,
            flow: 0.6,
            chaos: 0.2,
            ..Default::default()
        };

        let decayed_state = service.apply_time_decay(initial_state, 1.0);

        assert!(decayed_state.intensity < initial_state.intensity, "Intensity should decay");
        assert!(decayed_state.chaos > initial_state.chaos, "Chaos should increase");
    }
}
