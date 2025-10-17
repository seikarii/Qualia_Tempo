//! # Responsibility
//! High-fidelity mock for IBossAIService trait.

use mockall::*;
use async_trait::async_trait;
use anyhow::Result;
use crate::services::interfaces::IBossAIService;
use shared_core::contracts::QualiaState;

mock! {
    pub BossAIService {}
    
    #[async_trait]
    impl IBossAIService for BossAIService {
        async fn update(&self, qualia_state: QualiaState) -> Result<()>;
    }
}
