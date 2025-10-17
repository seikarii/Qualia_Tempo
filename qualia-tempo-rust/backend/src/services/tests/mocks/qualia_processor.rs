//! # Responsibility
//! High-fidelity mock for IQualiaProcessorService trait.

use mockall::*;
use async_trait::async_trait;
use anyhow::Result;
use crate::services::interfaces::IQualiaProcessorService;
use shared_core::contracts::{PlayerAction, QualiaState};

mock! {
    pub QualiaProcessorService {}
    
    #[async_trait]
    impl IQualiaProcessorService for QualiaProcessorService {
        async fn calculate_qualia(&self, action: PlayerAction) -> Result<QualiaState>;
    }
}
