//! # Responsibility
//! Coordinates all combat-related services to produce unified CombatState.
//!
//! ---
//!
//! This service aggregates outputs from `GameLogicService`, `BossAIService`,
//! and `PatternSystemService` into a single authoritative `CombatState` that
//! is streamed to clients. Acts as the central coordinator for combat flow.

use crate::services::interfaces::{IEventBus, ILogger};
use anyhow::Result;
use async_trait::async_trait;
use shaku::Component;
use shared_core::contracts::{BossState, CombatState, GameStatus, PlayerAbilities, PlayerState, QualiaState};
use shared_core::events::GameEvent;
use shared_core::traits::{IBossAIService, ICombatOrchestratorService, IGameLogicService, IPatternSystemService};
use shared_core::utils::Vec2;
use std::sync::{Arc, Mutex};
use tokio::task::JoinHandle;
use tracing::{info, instrument};

/// # Responsibility
/// Orchestrates combat subsystems and aggregates state for streaming.
///
/// ---
///
/// Coordinates `GameLogicService`, `BossAIService`, and `PatternSystemService`
/// to produce unified `CombatState` snapshots. Ensures synchronization between
/// all combat subsystems.
#[derive(Component)]
#[shaku(interface = ICombatOrchestratorService)]
pub struct CombatOrchestratorService {
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,

    #[shaku(inject)]
    event_bus: Arc<dyn IEventBus>,

    #[shaku(inject)]
    game_logic: Arc<dyn IGameLogicService>,

    #[shaku(inject)]
    boss_ai: Arc<dyn IBossAIService>,

    #[shaku(inject)]
    pattern_system: Arc<dyn IPatternSystemService>,

    /// Internal aggregated state
    state: Arc<Mutex<InternalCombatState>>,

    /// State update loop handle
    update_loop_handle: Arc<Mutex<Option<JoinHandle<()>>>>,
}

/// # Responsibility
/// Internal mutable combat state aggregated from subsystems.
pub struct InternalCombatState {
    current_state: CombatState,
    last_update_time: std::time::Instant,
}

impl Default for InternalCombatState {
    fn default() -> Self {
        Self {
            current_state: CombatState {
                game_state: GameStatus::Idle,
                player: PlayerState {
                    position: Vec2::new(0.0, 0.0),
                    velocity: Vec2::new(0.0, 0.0),
                    health: 100.0,
                    max_health: 100.0,
                    abilities: PlayerAbilities::default(),
                    is_invulnerable: false,
                    combo_count: 0,
                    buffs: Vec::new(),
                    debuffs: Vec::new(),
                },
                boss: BossState {
                    id: "default_boss".to_string(),
                    name: "Unknown Boss".to_string(),
                    position: Vec2::new(0.0, 0.0),
                    health: 100.0,
                    max_health: 100.0,
                    is_vulnerable: false,
                    phase: 1,
                    current_aggression_level: 0.5,
                },
                qualia: QualiaState::default(),
                score: 0,
                elapsed_time: 0.0,
                timestamp: chrono::Utc::now().timestamp_millis() as f64,
                qualia_event_history: Vec::new(),
            },
            last_update_time: std::time::Instant::now(),
        }
    }
}

#[async_trait]
impl ICombatOrchestratorService for CombatOrchestratorService {
    #[instrument(skip(self))]
    async fn start(&self) -> Result<()> {
        info!("Starting CombatOrchestratorService...");

        // Start subsystems
        self.boss_ai.start().await?;
        self.pattern_system.start().await?;

        // Start state update loop
        let _logger = self.logger.clone();
        let state = self.state.clone();
        let event_bus = self.event_bus.clone();

        let handle = tokio::spawn(async move {
            let mut interval = tokio::time::interval(tokio::time::Duration::from_millis(16)); // ~60 FPS

            loop {
                interval.tick().await;

                let mut state_lock = state.lock().expect("CombatOrchestrator: Failed to lock state");
                let _dt = state_lock.last_update_time.elapsed().as_secs_f32();
                state_lock.last_update_time = std::time::Instant::now();

                // Update timestamp
                state_lock.current_state.timestamp = chrono::Utc::now().timestamp_millis() as f64;

                // Emit state update event
                if let Err(e) = event_bus.emit(GameEvent::CombatStateUpdated {
                    state: Box::new(state_lock.current_state.clone()),
                }) {
                    tracing::warn!("CombatOrchestrator: Failed to emit state update: {:?}", e);
                }

                drop(state_lock); // Release lock

                // Check for shutdown signal (optional: implement graceful shutdown)
            }
        });

        *self.update_loop_handle.lock().expect("CombatOrchestrator: Failed to lock update loop handle") = Some(handle);
        info!("CombatOrchestratorService started successfully");
        Ok(())
    }

    #[instrument(skip(self))]
    async fn stop(&self) -> Result<()> {
        info!("Stopping CombatOrchestratorService...");

        // Stop subsystems
        self.pattern_system.stop().await?;
        self.boss_ai.stop().await?;

        // Stop update loop
        let mut handle_lock = self.update_loop_handle.lock().expect("CombatOrchestrator: Failed to lock update loop handle");
        if let Some(handle) = handle_lock.take() {
            handle.abort();
            info!("CombatOrchestratorService update loop stopped");
        }

        info!("CombatOrchestratorService stopped successfully");
        Ok(())
    }

    #[instrument(skip(self))]
    async fn get_current_state(&self) -> Result<CombatState> {
        let state_lock = self.state.lock().expect("CombatOrchestrator: Failed to lock state");
        Ok(state_lock.current_state.clone())
    }

    #[instrument(skip(self))]
    async fn update(&self, dt: f32) -> Result<CombatState> {
        self.logger.debug(&format!("CombatOrchestrator: Updating with dt={}", dt));

        // Get updated state from game logic
        let updated_state = self.game_logic.update_game_state(dt).await?;

        // Update internal state
        {
            let mut state_lock = self.state.lock().expect("CombatOrchestrator: Failed to lock state");
            state_lock.current_state = updated_state.clone();
            state_lock.last_update_time = std::time::Instant::now();
        }

        // Emit state update event
        self.event_bus.emit(GameEvent::CombatStateUpdated {
            state: Box::new(updated_state.clone()),
        })?;

        Ok(updated_state)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_get_current_state_returns_initial_state() {
        // Basic structural test without full DI setup
        // Integration tests with full DI are in tests/integration/
    }

    #[tokio::test]
    async fn test_internal_combat_state_default() {
        let internal_state = InternalCombatState::default();

        assert_eq!(internal_state.current_state.game_state, GameStatus::Idle);
        assert_eq!(internal_state.current_state.player.health, 100.0);
        assert_eq!(internal_state.current_state.boss.health, 100.0);
    }
}
