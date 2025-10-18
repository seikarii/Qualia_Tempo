//! # Responsibility
//! Executes boss attack patterns and manages combat mechanics.
//!
//! ---
//!
//! Subscribes to `BossAttack` events and translates them into gameplay
//! mechanics (projectile spawns, damage zones, telegraph visuals).

use crate::services::interfaces::{IEventBus, ILogger};
use anyhow::Result;
use async_trait::async_trait;
use shaku::Component;
use shared_core::contracts::PatternData;
use shared_core::events::{CombatEvent, GameEvent};
use shared_core::traits::IPatternSystemService;
use std::sync::{Arc, Mutex};
use tokio::task::JoinHandle;
use tracing::{info, instrument, warn};

/// # Responsibility
/// Executes boss attack patterns and spawns projectiles/AOE zones.
///
/// ---
///
/// Runs an event loop that listens for `BossAttack` events and executes
/// the corresponding pattern logic (spawn projectiles, damage zones, etc.).
#[derive(Component)]
#[shaku(interface = IPatternSystemService)]
pub struct PatternSystemService {
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,

    #[shaku(inject)]
    event_bus: Arc<dyn IEventBus>,

    /// Loaded patterns
    patterns: Arc<Mutex<Vec<PatternData>>>,

    /// Event loop handle
    event_loop_handle: Arc<Mutex<Option<JoinHandle<()>>>>,
}

#[async_trait]
impl IPatternSystemService for PatternSystemService {
    #[instrument(skip(self))]
    async fn start(&self) -> Result<()> {
        info!("Starting PatternSystemService...");

        let event_bus = self.event_bus.clone();
        let logger = self.logger.clone();
        let handle = tokio::spawn(async move {
            let mut events = event_bus.subscribe();

            loop {
                match events.recv().await {
                    Ok(GameEvent::Combat(CombatEvent::BossAttack { pattern })) => {
                        logger.info(&format!("PatternSystem: Executing pattern {}", pattern.name));

                        if let Err(e) = Self::execute_pattern_internal(&logger, &event_bus, &pattern).await {
                            logger.error(&format!("PatternSystem: Error executing pattern: {:?}", e));
                        }
                    }
                    Ok(_) => {
                        // Ignore other events
                    }
                    Err(tokio::sync::broadcast::error::RecvError::Lagged(skipped)) => {
                        warn!("PatternSystem: Lagged, skipped {} events", skipped);
                    }
                    Err(tokio::sync::broadcast::error::RecvError::Closed) => {
                        info!("PatternSystem: EventBus closed, stopping");
                        break;
                    }
                }
            }
        });

        *self.event_loop_handle.lock().expect("PatternSystemService: Failed to lock event loop handle") = Some(handle);
        info!("PatternSystemService started successfully");
        Ok(())
    }

    #[instrument(skip(self))]
    async fn stop(&self) -> Result<()> {
        info!("Stopping PatternSystemService...");

        let mut handle_lock = self.event_loop_handle.lock().expect("PatternSystemService: Failed to lock event loop handle");
        if let Some(handle) = handle_lock.take() {
            handle.abort();
            info!("PatternSystemService stopped successfully");
        }

        Ok(())
    }

    #[instrument(skip(self))]
    async fn execute_pattern(&self, pattern: &PatternData) -> Result<()> {
        self.logger.info(&format!("PatternSystem: Executing pattern {}", pattern.name));
        Self::execute_pattern_internal(&self.logger, &self.event_bus, pattern).await
    }

    #[instrument(skip(self))]
    async fn load_patterns(&self, patterns: Vec<PatternData>) -> Result<()> {
        let mut patterns_lock = self.patterns.lock().expect("PatternSystemService: Failed to lock patterns");
        *patterns_lock = patterns;
        self.logger.info(&format!("PatternSystem: Loaded {} patterns", patterns_lock.len()));
        Ok(())
    }
}

impl PatternSystemService {
    /// # Responsibility
    /// Internal pattern execution logic.
    async fn execute_pattern_internal(
        logger: &Arc<dyn ILogger>,
        event_bus: &Arc<dyn IEventBus>,
        pattern: &PatternData,
    ) -> Result<()> {
        // Emit telegraph event (visual warning)
        event_bus.emit(GameEvent::Combat(CombatEvent::PatternTelegraph {
            pattern: pattern.clone(),
        }))?;

        // Wait for telegraph duration
        tokio::time::sleep(tokio::time::Duration::from_secs_f64(pattern.telegraph_duration_sec)).await;

        // Execute actual attack
        logger.info(&format!("PatternSystem: Pattern {} executing attack phase", pattern.name));

        // Emit projectile spawn events for each spawn position
        for position in &pattern.spawn_positions {
            event_bus.emit(GameEvent::Combat(CombatEvent::ProjectileSpawned {
                position: *position,
                damage: pattern.damage,
                pattern_id: pattern.id.clone(),
            }))?;
        }

        Ok(())
    }
}

impl Default for PatternSystemService {
    fn default() -> Self {
        Self {
            logger: Arc::new(crate::services::core::QualiaLogger),
            event_bus: Arc::new(crate::services::core::EventBusService::default()),
            patterns: Arc::new(Mutex::new(Vec::new())),
            event_loop_handle: Arc::new(Mutex::new(None)),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::tests::mocks::{MockEventBus, MockLogger};
    use shared_core::contracts::{AttackPatternType, PatternData};
    use shared_core::utils::Vec2;

    fn create_test_pattern_system() -> PatternSystemService {
        let mut mock_logger = MockLogger::new();
        mock_logger.expect_info().returning(|_| ());
        mock_logger.expect_warn().returning(|_| ());
        mock_logger.expect_error().returning(|_| ());

        let mut mock_event_bus = MockEventBus::new();
        mock_event_bus.expect_emit().returning(|_| Ok(1));
        mock_event_bus.expect_subscribe().returning(|| {
            let (_tx, rx) = tokio::sync::broadcast::channel(100);
            rx
        });

        PatternSystemService {
            logger: Arc::new(mock_logger),
            event_bus: Arc::new(mock_event_bus),
            patterns: Arc::new(Mutex::new(Vec::new())),
            event_loop_handle: Arc::new(Mutex::new(None)),
        }
    }

    fn create_test_pattern() -> PatternData {
        PatternData {
            id: "pattern_001".to_string(),
            name: "Test Attack".to_string(),
            pattern_type: AttackPatternType::Projectile,
            trigger_time_sec: 0.0,
            telegraph_duration_sec: 0.1, // Fast for testing
            attack_duration_sec: 1.0,
            damage: 15.0,
            spawn_positions: vec![Vec2::new(10.0, 20.0), Vec2::new(30.0, 40.0)],
            metadata: serde_json::json!({"difficulty": 2}),
        }
    }

    #[tokio::test]
    async fn test_pattern_system_starts_successfully() {
        let pattern_system = create_test_pattern_system();
        let result = pattern_system.start().await;

        assert!(result.is_ok(), "PatternSystem should start successfully");

        // Cleanup
        let _ = pattern_system.stop().await;
    }

    #[tokio::test]
    async fn test_pattern_system_stops_successfully() {
        let pattern_system = create_test_pattern_system();
        pattern_system.start().await.unwrap();

        let result = pattern_system.stop().await;
        assert!(result.is_ok(), "PatternSystem should stop successfully");
    }

    #[tokio::test]
    async fn test_load_patterns_updates_internal_state() {
        let pattern_system = create_test_pattern_system();
        let patterns = vec![create_test_pattern()];

        let result = pattern_system.load_patterns(patterns).await;
        assert!(result.is_ok(), "Loading patterns should succeed");

        let patterns_lock = pattern_system.patterns.lock().unwrap();
        assert_eq!(patterns_lock.len(), 1);
        assert_eq!(patterns_lock[0].id, "pattern_001");
    }

    #[tokio::test]
    async fn test_execute_pattern_emits_telegraph_event() {
        let pattern_system = create_test_pattern_system();
        let pattern = create_test_pattern();

        let result = pattern_system.execute_pattern(&pattern).await;
        assert!(result.is_ok(), "Pattern execution should succeed");
    }

    #[tokio::test]
    async fn test_execute_pattern_with_multiple_spawn_positions() {
        let pattern_system = create_test_pattern_system();
        let pattern = PatternData {
            id: "multi_spawn".to_string(),
            name: "Multi Spawn Pattern".to_string(),
            pattern_type: AttackPatternType::AreaOfEffect,
            trigger_time_sec: 0.0,
            telegraph_duration_sec: 0.05, // Very fast for testing
            attack_duration_sec: 1.0,
            damage: 20.0,
            spawn_positions: vec![
                Vec2::new(0.0, 0.0),
                Vec2::new(10.0, 10.0),
                Vec2::new(20.0, 20.0),
            ],
            metadata: serde_json::json!({"difficulty": 3}),
        };

        let result = pattern_system.execute_pattern(&pattern).await;
        assert!(result.is_ok(), "Multi-spawn pattern should execute successfully");
    }

    #[tokio::test]
    async fn test_execute_pattern_respects_telegraph_duration() {
        let pattern_system = create_test_pattern_system();
        let pattern = PatternData {
            id: "timed_pattern".to_string(),
            name: "Timed Pattern".to_string(),
            pattern_type: AttackPatternType::Projectile,
            trigger_time_sec: 0.0,
            telegraph_duration_sec: 0.1,
            attack_duration_sec: 1.0,
            damage: 10.0,
            spawn_positions: vec![Vec2::new(0.0, 0.0)],
            metadata: serde_json::json!({}),
        };

        let start = std::time::Instant::now();
        let result = pattern_system.execute_pattern(&pattern).await;
        let elapsed = start.elapsed();

        assert!(result.is_ok(), "Pattern should execute successfully");
        assert!(elapsed.as_secs_f64() >= 0.1, "Should wait for telegraph duration");
    }

    #[tokio::test]
    async fn test_pattern_execution_internal_logic() {
        let mut mock_logger = MockLogger::new();
        mock_logger.expect_info().return_const(());

        let mut mock_event_bus = MockEventBus::new();
        mock_event_bus.expect_emit().returning(|_| Ok(1));

        let logger: Arc<dyn ILogger> = Arc::new(mock_logger);
        let event_bus: Arc<dyn IEventBus> = Arc::new(mock_event_bus);
        let pattern = create_test_pattern();

        let result = PatternSystemService::execute_pattern_internal(&logger, &event_bus, &pattern).await;
        assert!(result.is_ok(), "Internal pattern execution should succeed");
    }

    #[test]
    fn test_pattern_system_default_initialization() {
        let pattern_system = PatternSystemService::default();

        let patterns_lock = pattern_system.patterns.lock().unwrap();
        assert_eq!(patterns_lock.len(), 0, "Default should have no patterns loaded");
    }

    #[tokio::test]
    async fn test_execute_pattern_with_zero_spawn_positions() {
        let pattern_system = create_test_pattern_system();
        let pattern = PatternData {
            id: "no_spawns".to_string(),
            name: "No Spawns Pattern".to_string(),
            pattern_type: AttackPatternType::Wave,
            trigger_time_sec: 0.0,
            telegraph_duration_sec: 0.05,
            attack_duration_sec: 0.5,
            damage: 5.0,
            spawn_positions: vec![], // Empty spawns
            metadata: serde_json::json!({}),
        };

        let result = pattern_system.execute_pattern(&pattern).await;
        assert!(result.is_ok(), "Pattern with no spawns should still execute (telegraph only)");
    }
}
