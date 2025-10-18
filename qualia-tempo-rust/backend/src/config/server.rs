//! # Responsibility
//! Defines server configuration for the backend.

use serde::{Deserialize, Serialize};

/// # Responsibility
/// Configuration for the backend server.
///
/// ---
///
/// Loaded from YAML configuration files at startup.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerConfig {
    /// Server host address
    pub host: String,
    
    /// Server port
    pub port: u16,
    
    /// Maximum concurrent WebSocket connections
    pub max_connections: usize,
    
    /// EventBus channel capacity
    pub event_bus_capacity: usize,
}

impl Default for ServerConfig {
    fn default() -> Self {
        Self {
            host: "127.0.0.1".to_string(),
            port: 3000,
            max_connections: 1000,
            event_bus_capacity: 1000,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_server_config_default() {
        let config = ServerConfig::default();
        assert_eq!(config.host, "127.0.0.1");
        assert_eq!(config.port, 3000);
        assert_eq!(config.max_connections, 1000);
        assert_eq!(config.event_bus_capacity, 1000);
    }

    #[test]
    fn test_server_config_serialization() {
        let config = ServerConfig::default();
        let yaml = serde_yaml::to_string(&config).unwrap();
        let deserialized: ServerConfig = serde_yaml::from_str(&yaml).unwrap();
        
        assert_eq!(config.host, deserialized.host);
        assert_eq!(config.port, deserialized.port);
    }
}
