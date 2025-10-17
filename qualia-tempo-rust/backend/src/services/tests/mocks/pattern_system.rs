//! # Responsibility
//! High-fidelity mock for IPatternSystemService trait.

use mockall::*;
use async_trait::async_trait;
use anyhow::Result;
use crate::services::interfaces::IPatternSystemService;

mock! {
    pub PatternSystemService {}
    
    #[async_trait]
    impl IPatternSystemService for PatternSystemService {
        async fn load_pattern(&self, pattern_id: &str) -> Result<()>;
    }
}
