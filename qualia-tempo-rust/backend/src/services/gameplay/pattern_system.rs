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
use tokio::sync::RwLock;
use tracing::{info, instrument, warn};

use shared_core::contracts::combat_data::PatternData;
use shared_core::events::GameEvent;
use shared_core::traits::gameplay::IPatternSystemService;
use shared_core::traits::{IEventBus, ILogger};

/// # Responsibility
/// Active pattern instance with execution state.
#[derive(Debug, Clone)]
pub(crate) struct ActivePattern {
    pattern_id: String,
    #[allow(dead_code)] // Used for future trajectory calculation
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
        let definitions = self.pattern_definitions.read().await;
        let pattern_data = definitions
            .get(pattern_id)
            .context(format!("Pattern not found: {}", pattern_id))?;

        // Create active pattern instance
        let active = ActivePattern {
            pattern_id: pattern_id.to_string(),
            boss_position,
            time_elapsed: 0.0,
            is_telegraphing: true,
        };

        // Emit telegraph event
        use shared_core::events::combat_events::BossPatternTriggered;
        use std::time::{SystemTime, UNIX_EPOCH};
        
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
        let mut actives = self.active_patterns.write().await;
        actives.push(active);

        info!("Pattern {} activated with {}ms telegraph", pattern_id, pattern_data.telegraph_duration_ms);

        Ok(())
    }

    #[instrument(skip(self))]
    async fn update(&self, dt: f32) -> Result<()> {
        let mut actives = self.active_patterns.write().await;
        let definitions = self.pattern_definitions.read().await;

        // Update all active patterns
        let mut to_remove = Vec::new();

        for (idx, pattern) in actives.iter_mut().enumerate() {
            pattern.time_elapsed += dt;

            let definition = match definitions.get(&pattern.pattern_id) {
                Some(def) => def,
                None => {
                    warn!("Active pattern has no definition: {}", pattern.pattern_id);
                    to_remove.push(idx);
                    continue;
                }
            };

            let telegraph_duration = definition.telegraph_duration_ms as f32 / 1000.0;

            // Check if telegraph phase is complete
            if pattern.is_telegraphing && pattern.time_elapsed >= telegraph_duration {
                pattern.is_telegraphing = false;

                // Spawn projectiles/zones
                self.spawn_pattern_entities(pattern, definition)?;

                info!("Pattern {} telegraph complete, spawning entities", pattern.pattern_id);
            }

            // Remove pattern after full execution (telegraph + active duration)
            let total_duration = telegraph_duration + 2.0; // 2 seconds active duration
            if pattern.time_elapsed >= total_duration {
                to_remove.push(idx);
            }
        }

        // Remove completed patterns (iterate in reverse to avoid index shifts)
        for idx in to_remove.iter().rev() {
            actives.remove(*idx);
        }

        Ok(())
    }

    async fn load_patterns(&self, patterns: Vec<PatternData>) -> Result<()> {
        let mut definitions = self.pattern_definitions.write().await;

        for pattern in patterns {
            definitions.insert(pattern.id.clone(), pattern);
        }

        self.logger.info(&format!("Loaded {} pattern definitions", definitions.len()));

        Ok(())
    }
}

impl PatternSystemService {
    /// Spawns projectiles/zones for a pattern after telegraph.
    fn spawn_pattern_entities(&self, _pattern: &ActivePattern, definition: &PatternData) -> Result<()> {
        // Emit visual effect spawning based on pattern definition
        // TODO: Implement projectile/zone spawning system with proper trajectory calculation
        // For now, we just log that the pattern has been executed
        info!("Pattern {} executing with damage={}", definition.id, definition.damage);

        Ok(())
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
