//! # Responsibility
//! Implements boss AI behavior driven by player qualia state.
//!
//! ---
//!
//! Subscribes to QualiaStateValidated events and selects attack patterns.

use anyhow::Result;
use async_trait::async_trait;
use shaku::Component;
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::task::JoinHandle;
use tracing::{info, instrument, warn};

use shared_core::contracts::{BossState, QualiaState};
use shared_core::events::GameEvent;
use shared_core::traits::gameplay::{IBossAIService, IPatternSystemService};
use shared_core::traits::{IEventBus, ILogger};

/// # Responsibility
/// Manages boss AI decision-making and pattern selection.
#[derive(Component)]
#[shaku(interface = IBossAIService)]
pub struct BossAIService {
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,

    #[shaku(inject)]
    event_bus: Arc<dyn IEventBus>,

    #[shaku(inject)]
    pattern_system: Arc<dyn IPatternSystemService>,

    /// Current boss state.
    boss_state: Arc<RwLock<BossState>>,

    /// Event subscriber loop handle.
    #[allow(clippy::type_complexity)]
    subscriber_handle: Arc<RwLock<Option<JoinHandle<()>>>>,
}

#[async_trait]
impl IBossAIService for BossAIService {
    #[instrument(skip(self))]
    async fn start(&self) -> Result<()> {
        self.logger.info("Starting Boss AI event loop");

        let event_bus = self.event_bus.clone();
        let pattern_system = self.pattern_system.clone();
        let boss_state = self.boss_state.clone();
        let logger = self.logger.clone();

        let handle = tokio::spawn(async move {
            let mut rx = event_bus.subscribe();

            loop {
                match rx.recv().await {
                    Ok(GameEvent::QualiaStateUpdated { state }) => {
                        // React to validated qualia state
                        let current_boss = boss_state.read().await.clone();
                        let pattern_id = Self::select_pattern_static(&state, &current_boss);

                        logger.info(&format!(
                            "Boss reacting to qualia (intensity={}): selecting pattern {}",
                            state.intensity, pattern_id
                        ));

                        // Execute pattern
                        let boss_pos = (current_boss.position.x, current_boss.position.y);
                        if let Err(e) = pattern_system.execute_pattern(&pattern_id, boss_pos).await {
                            warn!("Failed to execute pattern: {:?}", e);
                        }
                    }
                    Err(tokio::sync::broadcast::error::RecvError::Lagged(skipped)) => {
                        warn!("Boss AI lagging! Skipped {} events", skipped);
                    }
                    Err(tokio::sync::broadcast::error::RecvError::Closed) => {
                        info!("EventBus closed, stopping Boss AI loop");
                        break;
                    }
                    _ => {}
                }
            }
        });

        let mut handle_lock = self.subscriber_handle.write().await;
        *handle_lock = Some(handle);

        Ok(())
    }

    #[instrument(skip(self))]
    async fn stop(&self) -> Result<()> {
        self.logger.info("Stopping Boss AI event loop");

        let mut handle_lock = self.subscriber_handle.write().await;
        if let Some(handle) = handle_lock.take() {
            handle.abort();
        }

        Ok(())
    }

    fn select_pattern(&self, qualia: &QualiaState, boss_state: &BossState) -> String {
        Self::select_pattern_static(qualia, boss_state)
    }

    #[instrument(skip(self))]
    async fn update(&self, dt: f32, qualia: &QualiaState) -> Result<BossState> {
        let mut boss = self.boss_state.write().await;

        // Update boss state based on qualia (aggression increases with player intensity)
        boss.current_aggression_level = (boss.current_aggression_level + qualia.intensity * dt * 0.1).min(1.0);

        // Decay aggression over time
        boss.current_aggression_level = (boss.current_aggression_level - dt * 0.05).max(0.0);

        Ok(boss.clone())
    }
}

impl BossAIService {
    /// Static pattern selection logic (testable without async).
    fn select_pattern_static(qualia: &QualiaState, _boss_state: &BossState) -> String {
        // Pattern selection based on qualia state
        if qualia.intensity > 0.8 {
            "barrage_high".to_string()
        } else if qualia.chaos > 0.6 {
            "chaotic_spiral".to_string()
        } else if qualia.flow > 0.7 {
            "rhythmic_pulse".to_string()
        } else {
            "basic_projectile".to_string()
        }
    }
}

impl Default for BossAIService {
    fn default() -> Self {
        Self {
            logger: Arc::new(crate::services::core::QualiaLogger),
            event_bus: Arc::new(crate::services::core::EventBusService::default()),
            pattern_system: Arc::new(crate::services::gameplay::PatternSystemService::default()),
            boss_state: Arc::new(RwLock::new(BossState::default())),
            subscriber_handle: Arc::new(RwLock::new(None)),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::gameplay::PatternSystemService;
    use crate::services::tests::mocks::{MockEventBus, MockLogger};
    use shared_core::utils::Vec2;

    fn create_test_service() -> BossAIService {
        BossAIService {
            logger: Arc::new(MockLogger::with_defaults()),
            event_bus: Arc::new(MockEventBus::with_defaults()),
            pattern_system: Arc::new(PatternSystemService::default()),
            boss_state: Arc::new(RwLock::new(BossState::default())),
            subscriber_handle: Arc::new(RwLock::new(None)),
        }
    }

    fn create_boss_state() -> BossState {
        BossState {
            id: "test_boss".to_string(),
            position: Vec2::new(0.0, 0.0),
            velocity: Vec2::ZERO,
            health: 100.0,
            max_health: 100.0,
            current_pattern_id: None,
            is_stunned: false,
            phase: 1,
            current_aggression_level: 0.5,
        }
    }

    #[test]
    fn test_select_pattern_high_intensity() {
        let qualia = QualiaState {
            intensity: 0.9,
            ..Default::default()
        };
        let boss = create_boss_state();

        let pattern = BossAIService::select_pattern_static(&qualia, &boss);

        assert_eq!(pattern, "barrage_high");
    }

    #[test]
    fn test_select_pattern_high_chaos() {
        let qualia = QualiaState {
            intensity: 0.5,
            chaos: 0.7,
            ..Default::default()
        };
        let boss = create_boss_state();

        let pattern = BossAIService::select_pattern_static(&qualia, &boss);

        assert_eq!(pattern, "chaotic_spiral");
    }

    #[test]
    fn test_select_pattern_high_flow() {
        let qualia = QualiaState {
            intensity: 0.5,
            chaos: 0.3,
            flow: 0.8,
            ..Default::default()
        };
        let boss = create_boss_state();

        let pattern = BossAIService::select_pattern_static(&qualia, &boss);

        assert_eq!(pattern, "rhythmic_pulse");
    }

    #[test]
    fn test_select_pattern_default() {
        let qualia = QualiaState::default();
        let boss = create_boss_state();

        let pattern = BossAIService::select_pattern_static(&qualia, &boss);

        assert_eq!(pattern, "basic_projectile");
    }

    #[tokio::test]
    async fn test_update_increases_aggression() {
        let service = create_test_service();
        let qualia = QualiaState {
            intensity: 1.0,
            ..Default::default()
        };

        let result = service.update(1.0, &qualia).await;

        assert!(result.is_ok());
        let boss = result.unwrap();
        assert!(boss.current_aggression_level > 0.5, "Aggression should increase");
    }

    #[tokio::test]
    async fn test_start_stop_lifecycle() {
        let service = create_test_service();

        let start_result = service.start().await;
        assert!(start_result.is_ok());

        let stop_result = service.stop().await;
        assert!(stop_result.is_ok());
    }
}
