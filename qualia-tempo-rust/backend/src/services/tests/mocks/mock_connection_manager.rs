//! # Responsibility
//! High-fidelity mock for IConnectionManagerService using mockall.
//!
//! ---
//!
//! COMPLIANCE: QUALIA.CODE.RUST §3.2 - All mocks use mockall for type safety.

use mockall::*;
use async_trait::async_trait;
use anyhow::Result;
use shared_core::traits::IConnectionManagerService;

mock! {
    /// # Responsibility
    /// High-fidelity mock for IConnectionManagerService trait.
    pub ConnectionManager {}
    
    #[async_trait]
    impl IConnectionManagerService for ConnectionManager {
        async fn register_connection(&self, connection_id: String) -> Result<()>;
        async fn unregister_connection(&self, connection_id: &str) -> Result<()>;
        fn update_heartbeat(&self, connection_id: &str);
        fn active_connection_count(&self) -> usize;
        fn get_active_connections(&self) -> Vec<String>;
    }
}
