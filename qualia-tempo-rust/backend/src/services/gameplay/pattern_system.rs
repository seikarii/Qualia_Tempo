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
