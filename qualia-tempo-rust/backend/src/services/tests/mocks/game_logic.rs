//! # Responsibility
//! High-fidelity mock for IGameLogicService trait.

use mockall::*;
use async_trait::async_trait;
use anyhow::Result;
use crate::services::interfaces::IGameLogicService;
use shared_core::contracts::{PlayerAction, QualiaState};

mock! {
    pub GameLogicService {}
    
    #[async_trait]
    impl IGameLogicService for GameLogicService {
        async fn process_action(&self, action: PlayerAction) -> Result<QualiaState>;
    }
}
