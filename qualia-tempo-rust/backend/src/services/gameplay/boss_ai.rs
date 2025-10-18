//! # Responsibility
//! Implements adaptive boss AI that responds to player qualia state.
//!
//! ---
//!
//! Subscribes to `QualiaStateUpdated` events and triggers attack patterns
//! based on player performance. Higher qualia intensity = more aggressive AI.

use crate::config::BossAIConfig;
use crate::services::interfaces::{IEventBus, ILogger};
use anyhow::Result;
use async_trait::async_trait;
use shaku::Component;
use shared_core::contracts::{BossState, PatternData, QualiaState};
use shared_core::events::{CombatEvent, GameEvent};
use shared_core::traits::IBossAIService;
use shared_core::utils::Vec2;
use std::sync::{Arc, Mutex};
use tokio::task::JoinHandle;
use tracing::{info, instrument, warn};

/// # Responsibility
/// Manages boss AI decision-making and pattern selection.
///
/// ---
///
/// Runs an event loop that monitors player qualia state and triggers
/// attack patterns dynamically. Difficulty scales with player performance.
#[derive(Component)]
#[shaku(interface = IBossAIService)]
pub struct BossAIService {
    config: Arc<BossAIConfig>,

    #[shaku(inject)]
    logger: Arc<dyn ILogger>,

    #[shaku(inject)]
    event_bus: Arc<dyn IEventBus>,

    /// Internal boss state
    state: Arc<Mutex<InternalBossState>>,

    /// Event loop handle
    event_loop_handle: Arc<Mutex<Option<JoinHandle<()>>>>,
}

/// # Responsibility
/// Internal mutable boss AI state.
pub struct InternalBossState {
    health: f32,
    current_phase: u8,
    aggression_level: f32,
    #[allow(dead_code)] // Will be used in attack logic implementation
    last_attack_time: f64,
    patterns_loaded: Vec<PatternData>,
}

impl Default for InternalBossState {
    fn default() -> Self {
        Self {
            health: 100.0,
            current_phase: 1,
            aggression_level: 0.5,
            last_attack_time: 0.0,
            patterns_loaded: Vec::new(),
        }
    }
}

#[async_trait]
impl IBossAIService for BossAIService {
    #[instrument(skip(self))]
    async fn start(&self) -> Result<()> {
        info!("Starting BossAIService...");

        let event_bus = self.event_bus.clone();
        let logger = self.logger.clone();
        let state = self.state.clone();
        let config = self.config.clone();

        let handle = tokio::spawn(async move {
            let mut events = event_bus.subscribe();

            loop {
                match events.recv().await {
                    Ok(GameEvent::QualiaStateUpdated { state: qualia_state }) => {
                        // React to player qualia state
                        if let Err(e) = Self::on_qualia_updated(&logger, &state, &config, &event_bus, qualia_state).await {
                            logger.error(&format!("BossAI: Error processing qualia update: {:?}", e));
                        }
                    }
                    Ok(_) => {
                        // Ignore other events
                    }
                    Err(tokio::sync::broadcast::error::RecvError::Lagged(skipped)) => {
                        warn!("BossAI: Lagged, skipped {} events", skipped);
                    }
                    Err(tokio::sync::broadcast::error::RecvError::Closed) => {
                        info!("BossAI: EventBus closed, stopping");
                        break;
                    }
                }
            }
        });

        *self.event_loop_handle.lock().expect("BossAIService: Failed to lock event loop handle") = Some(handle);
        info!("BossAIService started successfully");
        Ok(())
    }

    #[instrument(skip(self))]
    async fn stop(&self) -> Result<()> {
        info!("Stopping BossAIService...");

        let mut handle_lock = self.event_loop_handle.lock().expect("BossAIService: Failed to lock event loop handle");
        if let Some(handle) = handle_lock.take() {
            handle.abort();
            info!("BossAIService stopped successfully");
        }

        Ok(())
    }

    #[instrument(skip(self))]
    async fn trigger_pattern(&self, pattern_id: &str) -> Result<()> {
        info!("BossAI: Manually triggering pattern {}", pattern_id);

        let state = self.state.lock().expect("BossAIService: Failed to lock state");
        let pattern = state
            .patterns_loaded
            .iter()
            .find(|p| p.id == pattern_id)
            .ok_or_else(|| anyhow::anyhow!("Pattern not found: {}", pattern_id))?;

        // Emit BossAttack event
        self.event_bus.emit(GameEvent::Combat(CombatEvent::BossAttack {
            pattern: pattern.clone(),
        }))?;

        Ok(())
    }

    fn get_boss_state(&self) -> BossState {
        let state = self.state.lock().expect("BossAIService: Failed to lock state");
        BossState {
            id: "boss_001".to_string(),
            name: "Chaos Conductor".to_string(),
            position: Vec2::new(0.0, 0.0),
            health: state.health,
            max_health: 100.0,
            is_vulnerable: false,
            phase: state.current_phase,
            current_aggression_level: state.aggression_level,
        }
    }
}

impl BossAIService {
    /// # Responsibility
    /// Handler for QualiaStateUpdated events.
    #[allow(clippy::unused_async)]
    async fn on_qualia_updated(
        logger: &Arc<dyn ILogger>,
        state: &Arc<Mutex<InternalBossState>>,
        config: &Arc<BossAIConfig>,
        event_bus: &Arc<dyn IEventBus>,
        qualia_state: QualiaState,
    ) -> Result<()> {
        logger.debug(&format!("BossAI: Reacting to qualia state: {:?}", qualia_state));

        // Update aggression based on player intensity
        let mut state_lock = state.lock().expect("BossAIService: Failed to lock state in handler");
        state_lock.aggression_level = qualia_state.intensity * config.aggression_multiplier;

        // Decide if we should attack based on aggression
        let should_attack = state_lock.aggression_level > config.attack_threshold;

        if should_attack && !state_lock.patterns_loaded.is_empty() {
            // Select random pattern (simplified for now)
            let pattern_index = (qualia_state.intensity * state_lock.patterns_loaded.len() as f32) as usize;
            let pattern_index = pattern_index.min(state_lock.patterns_loaded.len() - 1);
            let pattern = state_lock.patterns_loaded[pattern_index].clone();

            drop(state_lock); // Release lock before emitting

            logger.info(&format!("BossAI: Triggering pattern: {}", pattern.name));
            event_bus.emit(GameEvent::Combat(CombatEvent::BossAttack { pattern }))?;
        }

        Ok(())
    }

    /// # Responsibility
    /// Load attack patterns into boss AI.
    pub fn load_patterns(&self, patterns: Vec<PatternData>) {
        let mut state = self.state.lock().expect("BossAIService: Failed to lock state for load_patterns");
        state.patterns_loaded = patterns;
        self.logger.info(&format!("BossAI: Loaded {} patterns", state.patterns_loaded.len()));
    }
}

impl Default for BossAIService {
    fn default() -> Self {
        Self {
            config: Arc::new(BossAIConfig::default()),
            logger: Arc::new(crate::services::core::QualiaLogger),
            event_bus: Arc::new(crate::services::core::EventBusService::default()),
            state: Arc::new(Mutex::new(InternalBossState::default())),
            event_loop_handle: Arc::new(Mutex::new(None)),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::BossAIConfig;
    use crate::services::tests::mocks::{MockEventBus, MockLogger};
    use shared_core::contracts::{AttackPatternType, PatternData, QualiaState};
    use shared_core::utils::Vec2;

    fn create_test_boss_ai() -> BossAIService {
        let mut mock_logger = MockLogger::new();
        mock_logger.expect_info().returning(|_| ());
        mock_logger.expect_debug().returning(|_| ());
        mock_logger.expect_warn().returning(|_| ());
        mock_logger.expect_error().returning(|_| ());

        let mut mock_event_bus = MockEventBus::new();
        mock_event_bus.expect_emit().returning(|_| Ok(1));
        mock_event_bus.expect_subscribe().returning(|| {
            let (_tx, rx) = tokio::sync::broadcast::channel(100);
            rx
        });

        BossAIService {
            config: Arc::new(BossAIConfig {
                aggression_multiplier: 1.5,
                attack_threshold: 0.6,
                attack_cooldown_sec: 1.0,
                phase_thresholds: vec![0.75, 0.5, 0.25],
            }),
            logger: Arc::new(mock_logger),
            event_bus: Arc::new(mock_event_bus),
            state: Arc::new(Mutex::new(InternalBossState::default())),
            event_loop_handle: Arc::new(Mutex::new(None)),
        }
    }

    fn create_test_pattern() -> PatternData {
        PatternData {
            id: "pattern_001".to_string(),
            name: "Test Pattern".to_string(),
            pattern_type: AttackPatternType::Projectile,
            trigger_time_sec: 0.0,
            telegraph_duration_sec: 0.5,
            attack_duration_sec: 2.0,
            damage: 10.0,
            spawn_positions: vec![Vec2::new(0.0, 0.0)],
            metadata: serde_json::json!({}),
        }
    }

    #[tokio::test]
    async fn test_boss_ai_starts_successfully() {
        let boss_ai = create_test_boss_ai();
        let result = boss_ai.start().await;

        assert!(result.is_ok(), "BossAI should start successfully");

        // Cleanup
        let _ = boss_ai.stop().await;
    }

    #[tokio::test]
    async fn test_boss_ai_stops_successfully() {
        let boss_ai = create_test_boss_ai();
        boss_ai.start().await.unwrap();

        let result = boss_ai.stop().await;
        assert!(result.is_ok(), "BossAI should stop successfully");
    }

    #[tokio::test]
    async fn test_trigger_pattern_emits_event() {
        let boss_ai = create_test_boss_ai();
        let pattern = create_test_pattern();
        boss_ai.load_patterns(vec![pattern.clone()]);

        let result = boss_ai.trigger_pattern("pattern_001").await;
        assert!(result.is_ok(), "Pattern trigger should succeed");
    }

    #[tokio::test]
    async fn test_trigger_nonexistent_pattern_fails() {
        let boss_ai = create_test_boss_ai();

        let result = boss_ai.trigger_pattern("nonexistent").await;
        assert!(result.is_err(), "Triggering nonexistent pattern should fail");
        assert!(result.unwrap_err().to_string().contains("Pattern not found"));
    }

    #[test]
    fn test_get_boss_state_returns_correct_values() {
        let boss_ai = create_test_boss_ai();
        let state = boss_ai.get_boss_state();

        assert_eq!(state.health, 100.0);
        assert_eq!(state.max_health, 100.0);
        assert_eq!(state.phase, 1);
        assert_eq!(state.current_aggression_level, 0.5);
    }

    #[test]
    fn test_load_patterns_updates_internal_state() {
        let boss_ai = create_test_boss_ai();
        let pattern = create_test_pattern();

        boss_ai.load_patterns(vec![pattern.clone()]);

        let state = boss_ai.state.lock().unwrap();
        assert_eq!(state.patterns_loaded.len(), 1);
        assert_eq!(state.patterns_loaded[0].id, "pattern_001");
    }

    #[tokio::test]
    async fn test_high_qualia_increases_aggression() {
        let config = Arc::new(BossAIConfig {
            aggression_multiplier: 2.0,
            attack_threshold: 0.5,
            attack_cooldown_sec: 1.0,
            phase_thresholds: vec![0.75, 0.5, 0.25],
        });

        let mut mock_logger = MockLogger::new();
        mock_logger.expect_debug().returning(|_| ());
        mock_logger.expect_info().returning(|_| ());

        let mut mock_event_bus = MockEventBus::new();
        mock_event_bus.expect_emit().returning(|_| Ok(1));

        let logger: Arc<dyn ILogger> = Arc::new(mock_logger);
        let event_bus: Arc<dyn IEventBus> = Arc::new(mock_event_bus);
        let state = Arc::new(Mutex::new(InternalBossState::default()));

        let high_intensity_qualia = QualiaState {
            intensity: 0.9,
            precision: 0.8,
            aggression: 0.7,
            flow: 0.8,
            chaos: 0.1,
            recovery: 0.0,
            transcendence: 0.5,
            collection_window_end: 1000.0,
        };

        let result = BossAIService::on_qualia_updated(
            &logger,
            &state,
            &config,
            &event_bus,
            high_intensity_qualia,
        )
        .await;

        assert!(result.is_ok(), "Handler should process qualia state successfully");

        let state_lock = state.lock().unwrap();
        assert!(state_lock.aggression_level > 1.0, "Aggression should scale with intensity");
    }

    #[tokio::test]
    async fn test_low_qualia_reduces_aggression() {
        let config = Arc::new(BossAIConfig {
            aggression_multiplier: 1.0,
            attack_threshold: 0.5,
            attack_cooldown_sec: 1.0,
            phase_thresholds: vec![0.75, 0.5, 0.25],
        });

        let mut mock_logger = MockLogger::new();
        mock_logger.expect_debug().returning(|_| ());

        let mut mock_event_bus = MockEventBus::new();
        mock_event_bus.expect_emit().returning(|_| Ok(1));

        let logger: Arc<dyn ILogger> = Arc::new(mock_logger);
        let event_bus: Arc<dyn IEventBus> = Arc::new(mock_event_bus);
        let state = Arc::new(Mutex::new(InternalBossState::default()));

        let low_intensity_qualia = QualiaState {
            intensity: 0.2,
            precision: 0.3,
            aggression: 0.1,
            flow: 0.2,
            chaos: 0.6,
            recovery: 0.0,
            transcendence: 0.0,
            collection_window_end: 1000.0,
        };

        let result = BossAIService::on_qualia_updated(
            &logger,
            &state,
            &config,
            &event_bus,
            low_intensity_qualia,
        )
        .await;

        assert!(result.is_ok(), "Handler should process qualia state successfully");

        let state_lock = state.lock().unwrap();
        assert!(state_lock.aggression_level < 0.5, "Aggression should remain low");
    }

    #[tokio::test]
    async fn test_boss_attacks_when_aggression_above_threshold() {
        let config = Arc::new(BossAIConfig {
            aggression_multiplier: 2.0,
            attack_threshold: 0.5,
            attack_cooldown_sec: 1.0,
            phase_thresholds: vec![0.75, 0.5, 0.25],
        });

        let mut mock_logger = MockLogger::new();
        mock_logger.expect_debug().returning(|_| ());
        mock_logger.expect_info().returning(|_| ());

        let mut mock_event_bus = MockEventBus::new();
        mock_event_bus.expect_emit().returning(|_| Ok(1));

        let logger: Arc<dyn ILogger> = Arc::new(mock_logger);
        let event_bus: Arc<dyn IEventBus> = Arc::new(mock_event_bus);
        let mut initial_state = InternalBossState::default();
        initial_state.patterns_loaded = vec![create_test_pattern()];
        let state = Arc::new(Mutex::new(initial_state));

        let high_intensity_qualia = QualiaState {
            intensity: 0.8,
            precision: 0.9,
            aggression: 0.7,
            flow: 0.9,
            chaos: 0.1,
            recovery: 0.0,
            transcendence: 0.0,
            collection_window_end: 1000.0,
        };

        let result = BossAIService::on_qualia_updated(
            &logger,
            &state,
            &config,
            &event_bus,
            high_intensity_qualia,
        )
        .await;

        assert!(result.is_ok(), "Should emit attack event when aggression is high");
    }
}
