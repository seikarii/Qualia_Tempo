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
