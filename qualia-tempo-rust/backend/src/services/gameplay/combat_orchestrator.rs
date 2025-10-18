//! # Responsibility
//! Coordinates all gameplay services into unified combat state.
//!
//! ---
//!
//! Aggregates state from GameLogic, BossAI, and PatternSystem.

use anyhow::Result;
use async_trait::async_trait;
use shaku::Component;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{info, instrument};

use shared_core::contracts::game_state::CombatState;
use shared_core::traits::gameplay::{IBossAIService, ICombatOrchestrator, IGameLogicService};
use shared_core::traits::ILogger;

/// # Responsibility
/// Orchestrates all combat subsystems and provides unified state.
#[derive(Component)]
#[shaku(interface = ICombatOrchestrator)]
pub struct CombatOrchestratorService {
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,

    #[shaku(inject)]
    game_logic: Arc<dyn IGameLogicService>,

    #[shaku(inject)]
    boss_ai: Arc<dyn IBossAIService>,

    /// Aggregated combat state.
    #[shaku(default = Arc::new(RwLock::new(CombatState::default())))]
    current_state: Arc<RwLock<CombatState>>,

    /// Combat session active flag.
    #[shaku(default = Arc::new(RwLock::new(false)))]
    is_active: Arc<RwLock<bool>>,
}

#[async_trait]
impl ICombatOrchestrator for CombatOrchestratorService {
    #[instrument(skip(self))]
    async fn get_combat_state(&self) -> Result<CombatState> {
        let state = self.current_state.read().await;
        Ok(state.clone())
    }

    #[instrument(skip(self))]
    async fn start_combat(&self) -> Result<()> {
        self.logger.info("Starting combat session");

        // Start boss AI event loop
        self.boss_ai.start().await?;

        // Mark combat as active
        {
            let mut is_active = self.is_active.write().await;
            *is_active = true;
        }

        info!("Combat session started");

        Ok(())
    }

    #[instrument(skip(self))]
    async fn end_combat(&self) -> Result<()> {
        self.logger.info("Ending combat session");

        // Stop boss AI
        self.boss_ai.stop().await?;

        // Mark combat as inactive
        {
            let mut is_active = self.is_active.write().await;
            *is_active = false;
        }

        info!("Combat session ended");

        Ok(())
    }

    #[instrument(skip(self))]
    async fn update(&self, dt: f32) -> Result<()> {
        let is_active = *self.is_active.read().await;

        if !is_active {
            return Ok(());
        }

        // Update game logic
        let combat_state = self.game_logic.update_game_state(dt).await?;

        // Update current state
        {
            let mut current = self.current_state.write().await;
            *current = combat_state;
        }

        Ok(())
    }
}

impl Default for CombatOrchestratorService {
    fn default() -> Self {
        // NOTE: Default implementation for testing only.
        // In production, use Shaku DI container to resolve all dependencies.
        unimplemented!("Use Shaku DI container to create CombatOrchestratorService")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::tests::mocks::MockLogger;
    use shared_core::contracts::game_state::{BossState, QualiaState};
    use shared_core::contracts::input::PlayerAction;
    use shared_core::traits::gameplay::{IBossAIService, IGameLogicService};
    use mockall::mock;

    // Create test-specific mocks for gameplay services
    mock! {
        pub GameLogic {}
        #[async_trait]
        impl IGameLogicService for GameLogic {
            async fn process_action(&self, action: PlayerAction, frontend_qualia: QualiaState) -> Result<QualiaState>;
            async fn update_game_state(&self, dt: f32) -> Result<CombatState>;
            fn get_current_score(&self) -> u32;
        }
    }

    mock! {
        pub BossAI {}
        #[async_trait]
        impl IBossAIService for BossAI {
            async fn start(&self) -> Result<()>;
            async fn stop(&self) -> Result<()>;
            fn select_pattern(&self, qualia: &QualiaState, boss_state: &BossState) -> String;
            async fn update(&self, dt: f32, qualia: &QualiaState) -> Result<BossState>;
        }
    }

    fn create_test_orchestrator() -> CombatOrchestratorService {
        let logger = Arc::new(MockLogger::with_defaults());
        
        let mut mock_game_logic = MockGameLogic::new();
        mock_game_logic
            .expect_update_game_state()
            .returning(|_| Ok(CombatState::default()));

        let mut mock_boss_ai = MockBossAI::new();
        mock_boss_ai.expect_start().returning(|| Ok(()));
        mock_boss_ai.expect_stop().returning(|| Ok(()));

        CombatOrchestratorService {
            logger,
            game_logic: Arc::new(mock_game_logic),
            boss_ai: Arc::new(mock_boss_ai),
            current_state: Arc::new(RwLock::new(CombatState::default())),
            is_active: Arc::new(RwLock::new(false)),
        }
    }

    #[tokio::test]
    async fn test_start_combat_activates_session() {
        let orchestrator = create_test_orchestrator();

        let result = orchestrator.start_combat().await;

        assert!(result.is_ok());
        let is_active = *orchestrator.is_active.read().await;
        assert!(is_active, "Combat should be active");
    }

    #[tokio::test]
    async fn test_end_combat_deactivates_session() {
        let orchestrator = create_test_orchestrator();

        orchestrator.start_combat().await.expect("Test should not panic");
        let result = orchestrator.end_combat().await;

        assert!(result.is_ok());
        let is_active = *orchestrator.is_active.read().await;
        assert!(!is_active, "Combat should be inactive");
    }

    #[tokio::test]
    async fn test_get_combat_state_returns_current() {
        let orchestrator = create_test_orchestrator();

        let result = orchestrator.get_combat_state().await;

        assert!(result.is_ok());
        let state = result.expect("Test should not panic");
        assert_eq!(state.score, 0); // Default state
    }

    #[tokio::test]
    async fn test_update_does_nothing_when_inactive() {
        let orchestrator = create_test_orchestrator();

        let result = orchestrator.update(0.016).await;

        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_full_combat_lifecycle() {
        let orchestrator = create_test_orchestrator();

        // Start combat
        orchestrator.start_combat().await.expect("Test should not panic");

        // Update a few frames
        orchestrator.update(0.016).await.expect("Test should not panic");
        orchestrator.update(0.016).await.expect("Test should not panic");

        // Get state
        let state = orchestrator.get_combat_state().await.expect("Test should not panic");
        assert_eq!(state.score, 0);

        // End combat
        orchestrator.end_combat().await.expect("Test should not panic");

        let is_active = *orchestrator.is_active.read().await;
        assert!(!is_active);
    }
}
