//! # Responsibility
//! Executes boss attack patterns and manages pattern lifecycle.
//!
//! ---
//!
//! Handles pattern spawning, telegraph visualization, and projectile management.

use anyhow::{Context, Result};
use async_trait::async_trait;
use shaku::Component;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::sync::RwLock;
use tracing::{info, instrument, warn};

use shared_core::contracts::combat_data::PatternData;
use shared_core::events::combat_events::BossPatternTriggered;
use shared_core::events::GameEvent;
use shared_core::traits::gameplay::IPatternSystemService;
use shared_core::traits::{IEventBus, ILogger};

/// # Responsibility
/// Active pattern instance with execution state.
///
/// ---
///
/// Internal struct for tracking pattern lifecycle. Public to satisfy Shaku visibility requirements.
#[derive(Debug, Clone)]
pub struct ActivePattern {
    pattern_id: String,
    #[allow(dead_code)] // Will be used for projectile trajectory calculation
    boss_position: (f32, f32),
    time_elapsed: f32,
    is_telegraphing: bool,
}

/// # Responsibility
/// Manages boss attack pattern execution and projectile spawning.
#[derive(Component)]
#[shaku(interface = IPatternSystemService)]
pub struct PatternSystemService {
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,

    #[shaku(inject)]
    event_bus: Arc<dyn IEventBus>,

    /// Pattern definitions loaded from data.
    pattern_definitions: Arc<RwLock<HashMap<String, PatternData>>>,

    /// Currently active patterns being executed.
    active_patterns: Arc<RwLock<Vec<ActivePattern>>>,
}

#[async_trait]
impl IPatternSystemService for PatternSystemService {
    #[instrument(skip(self))]
    async fn execute_pattern(&self, pattern_id: &str, boss_position: (f32, f32)) -> Result<()> {
        self.logger.info(&format!(
            "Executing pattern: {} at position ({}, {})",
            pattern_id, boss_position.0, boss_position.1
        ));

        // Verify pattern exists
        let pattern_data = {
            let definitions = self.pattern_definitions.read().await;
            definitions
                .get(pattern_id)
                .cloned()
                .context(format!("Pattern not found: {pattern_id}"))?
        };

        // Create active pattern instance
        let active = ActivePattern {
            pattern_id: pattern_id.to_string(),
            boss_position,
            time_elapsed: 0.0,
            is_telegraphing: true,
        };

        // Emit telegraph event
        #[allow(clippy::cast_precision_loss)] // Timestamp precision loss acceptable
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as f64;

        self.event_bus
            .emit(GameEvent::BossPatternTriggered {
                event: BossPatternTriggered {
                    pattern_id: pattern_id.to_string(),
                    pattern: pattern_data.clone(),
                    timestamp,
                },
            })
            .ok();

        // Add to active patterns
        {
            let mut actives = self.active_patterns.write().await;
            actives.push(active);
        }

        info!("Pattern {} activated with {}ms telegraph", pattern_id, pattern_data.telegraph_duration_ms);

        Ok(())
    }

    #[instrument(skip(self))]
    #[allow(clippy::cast_possible_truncation)] // Telegraph duration intentionally truncated to f32
    async fn update(&self, dt: f32) -> Result<()> {
        let mut actives = self.active_patterns.write().await;
        let definitions = self.pattern_definitions.read().await;

        // Update all active patterns
        let mut to_remove = Vec::new();

        for (idx, pattern) in actives.iter_mut().enumerate() {
            pattern.time_elapsed += dt;

            let Some(definition) = definitions.get(&pattern.pattern_id) else {
                warn!("Active pattern has no definition: {}", pattern.pattern_id);
                to_remove.push(idx);
                continue;
            };

            let telegraph_duration = definition.telegraph_duration_ms as f32 / 1000.0;

            // Check if telegraph phase is complete
            if pattern.is_telegraphing && pattern.time_elapsed >= telegraph_duration {
                pattern.is_telegraphing = false;

                // Spawn projectiles/zones
                self.spawn_pattern_entities(pattern, definition);

                info!("Pattern {} telegraph complete, spawning entities", pattern.pattern_id);
            }

            // Remove pattern after full execution (telegraph + active duration)
            let total_duration = telegraph_duration + 2.0; // 2 seconds active duration
            if pattern.time_elapsed >= total_duration {
                to_remove.push(idx);
            }
        }

        // Remove completed patterns (iterate in reverse to avoid index shifts)
        drop(definitions); // Drop early to release read lock
        for idx in to_remove.iter().rev() {
            actives.remove(*idx);
        }
        drop(actives);

        Ok(())
    }

    async fn load_patterns(&self, patterns: Vec<PatternData>) -> Result<()> {
        let count = {
            let mut definitions = self.pattern_definitions.write().await;

            for pattern in patterns {
                definitions.insert(pattern.id.clone(), pattern);
            }

            definitions.len()
        };

        self.logger.info(&format!("Loaded {count} pattern definitions"));

        Ok(())
    }
}

impl PatternSystemService {
    /// Spawns projectiles/zones for a pattern after telegraph.
    #[allow(clippy::unused_self)] // Will use self for event emission in full implementation
    fn spawn_pattern_entities(&self, _pattern: &ActivePattern, definition: &PatternData) {
        // Emit visual effect spawning based on pattern definition
        // TODO: Implement projectile/zone spawning system with proper trajectory calculation
        // For now, we just log that the pattern has been executed
        info!("Pattern {} executing with damage={}", definition.id, definition.damage);
    }
}

impl Default for PatternSystemService {
    fn default() -> Self {
        Self {
            logger: Arc::new(crate::services::core::QualiaLogger),
            event_bus: Arc::new(crate::services::core::EventBusService::default()),
            pattern_definitions: Arc::new(RwLock::new(HashMap::new())),
            active_patterns: Arc::new(RwLock::new(Vec::new())),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::tests::mocks::{MockEventBus, MockLogger};
    use shared_core::contracts::combat_data::PatternData;
    use shared_core::utils::Vec2;

    fn create_test_service() -> PatternSystemService {
        PatternSystemService {
            logger: Arc::new(MockLogger::with_defaults()),
            event_bus: Arc::new(MockEventBus::with_defaults()),
            pattern_definitions: Arc::new(RwLock::new(HashMap::new())),
            active_patterns: Arc::new(RwLock::new(Vec::new())),
        }
    }

    fn create_test_pattern() -> PatternData {
        PatternData {
            id: "test_pattern".to_string(),
            name: "Test Projectile Burst".to_string(),
            telegraph_duration_ms: 500.0,
            execution_duration_ms: 1000.0,
            damage: 10.0,
            spawn_positions: vec![Vec2::new(0.0, 0.0)],
            visual_effect_id: "burst_effect".to_string(),
            audio_cue_id: Some("attack_cue".to_string()),
        }
    }

    #[tokio::test]
    async fn test_load_patterns() {
        let service = create_test_service();
        let patterns = vec![create_test_pattern()];

        let result = service.load_patterns(patterns).await;

        assert!(result.is_ok());
        let definitions = service.pattern_definitions.read().await;
        assert_eq!(definitions.len(), 1);
        assert!(definitions.contains_key("test_pattern"));
    }

    #[tokio::test]
    async fn test_execute_pattern_activates_instance() {
        let service = create_test_service();
        
        // Load pattern first
        service.load_patterns(vec![create_test_pattern()]).await.unwrap();

        let result = service.execute_pattern("test_pattern", (100.0, 200.0)).await;

        assert!(result.is_ok());
        let actives = service.active_patterns.read().await;
        assert_eq!(actives.len(), 1);
        assert_eq!(actives[0].pattern_id, "test_pattern");
        assert_eq!(actives[0].boss_position, (100.0, 200.0));
        assert!(actives[0].is_telegraphing);
    }

    #[tokio::test]
    async fn test_update_completes_telegraph() {
        let service = create_test_service();
        
        // Load and execute pattern
        service.load_patterns(vec![create_test_pattern()]).await.unwrap();
        service.execute_pattern("test_pattern", (0.0, 0.0)).await.unwrap();

        // Update with dt > telegraph duration (500ms = 0.5s)
        let result = service.update(0.6).await;

        assert!(result.is_ok());
        let actives = service.active_patterns.read().await;
        assert!(!actives[0].is_telegraphing, "Telegraph should be complete");
    }

    #[tokio::test]
    async fn test_update_removes_expired_patterns() {
        let service = create_test_service();
        
        // Load and execute pattern
        service.load_patterns(vec![create_test_pattern()]).await.unwrap();
        service.execute_pattern("test_pattern", (0.0, 0.0)).await.unwrap();

        // Update with dt > total duration (telegraph 0.5s + active 2s = 2.5s)
        service.update(3.0).await.unwrap();

        let actives = service.active_patterns.read().await;
        assert_eq!(actives.len(), 0, "Expired pattern should be removed");
    }
}
