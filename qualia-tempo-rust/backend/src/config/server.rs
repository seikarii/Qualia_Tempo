//! # Responsibility
//! Server configuration structure.
//!
//! ---
//!
//! Defines all server-level settings: host, port, WebSocket config, etc.

use serde::Deserialize;

/// # Responsibility
/// Configuration for the Axum HTTP/WebSocket server.
///
/// ---
///
/// Loaded from YAML at startup and injected into server handlers.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerConfig {
    /// Server bind address (e.g., "0.0.0.0")
    pub host: String,
    
    /// Server port (e.g., 3000)
    pub port: u16,
    
    /// Maximum concurrent WebSocket connections
    pub max_connections: usize,
    
    /// WebSocket ping interval in milliseconds
    pub websocket_ping_interval_ms: u64,
    
    /// WebSocket message size limit in bytes
    pub max_message_size_bytes: usize,
}

impl Default for ServerConfig {
    fn default() -> Self {
        Self {
            host: "127.0.0.1".to_string(),
            port: 3000,
            max_connections: 1000,
            websocket_ping_interval_ms: 30000,
            max_message_size_bytes: 1024 * 1024, // 1MB
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = ServerConfig::default();
        assert_eq!(config.host, "127.0.0.1");
        assert_eq!(config.port, 3000);
        assert_eq!(config.max_connections, 1000);
    }

    #[test]
    fn test_deserialize_from_yaml() {
        let yaml = r#"
host: "0.0.0.0"
port: 8080
maxConnections: 500
websocketPingIntervalMs: 60000
maxMessageSizeBytes: 2097152
"#;
        let config: ServerConfig = serde_yaml::from_str(yaml).expect("Test should not panic");
        assert_eq!(config.host, "0.0.0.0");
        assert_eq!(config.port, 8080);
        assert_eq!(config.max_connections, 500);
        assert_eq!(config.websocket_ping_interval_ms, 60000);
        assert_eq!(config.max_message_size_bytes, 2_097_152);
    }
}
