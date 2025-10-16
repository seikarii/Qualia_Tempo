//! # Responsibility
//! WebSocket server configuration.

use serde::{Deserialize, Serialize};

/// # Responsibility
/// Configuration for WebSocket server binding.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebSocketConfig {
    /// Bind address (e.g., "127.0.0.1" or "0.0.0.0")
    pub bind_address: String,
    
    /// Bind port (e.g., 8080)
    pub port: u16,
}

impl Default for WebSocketConfig {
    fn default() -> Self {
        Self {
            bind_address: "127.0.0.1".to_string(),
            port: 8080,
        }
    }
}
