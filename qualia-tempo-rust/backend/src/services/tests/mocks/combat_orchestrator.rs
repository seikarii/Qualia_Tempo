//! # Responsibility
//! High-fidelity mock for ICombatOrchestratorService trait.

use mockall::*;
use async_trait::async_trait;
use anyhow::Result;
use crate::services::interfaces::ICombatOrchestratorService;

mock! {
    pub CombatOrchestratorService {}
    
    #[async_trait]
    impl ICombatOrchestratorService for CombatOrchestratorService {
        async fn start_combat(&self, song_id: &str) -> Result<()>;
        async fn end_combat(&self) -> Result<()>;
    }
}
