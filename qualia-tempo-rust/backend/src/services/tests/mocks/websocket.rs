//! # Responsibility
//! High-fidelity mock for IWebSocketService trait.

use mockall::*;
use async_trait::async_trait;
use anyhow::Result;
use uuid::Uuid;
use crate::services::interfaces::IWebSocketService;
use shared_core::events::GameEvent;

mock! {
    /// # Responsibility
    /// Mock implementation of IWebSocketService for unit testing.
    pub WebSocketService {}
    
    #[async_trait]
    impl IWebSocketService for WebSocketService {
        async fn start(&self) -> Result<()>;
        async fn broadcast_event(&self, event: GameEvent) -> Result<usize>;
        async fn send_to_client(&self, client_id: Uuid, event: GameEvent) -> Result<()>;
        fn get_connection_count(&self) -> usize;
        async fn disconnect_client(&self, client_id: Uuid) -> Result<()>;
        async fn shutdown(&self) -> Result<()>;
    }
}
