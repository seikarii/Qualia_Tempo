//! # Responsibility
//! Server configuration structure.

use serde::Deserialize;

/// # Responsibility
/// Configuration for the backend server (WebSocket, HTTP).
///
/// ---
///
/// Loaded from YAML at startup. Contains network settings, TLS config,
/// and operational parameters.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerConfig {
    /// Server bind address (e.g., "0.0.0.0")
    pub host: String,
    
    /// Server port (e.g., 8080)
    pub port: u16,
    
    /// Maximum WebSocket connections
    pub max_connections: usize,
    
    /// WebSocket message size limit in bytes
    pub max_message_size: usize,
    
    /// Enable TLS
    pub enable_tls: bool,
}

impl Default for ServerConfig {
    fn default() -> Self {
        Self {
            host: "127.0.0.1".to_string(),
            port: 8080,
            max_connections: 1000,
            max_message_size: 1024 * 1024, // 1MB
            enable_tls: false,
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
        assert_eq!(config.port, 8080);
        assert!(!config.enable_tls);
    }

    #[test]
    fn test_deserialize_from_yaml() {
        let yaml = r#"
host: "0.0.0.0"
port: 9000
maxConnections: 500
maxMessageSize: 2097152
enableTls: true
"#;
        let config: ServerConfig = serde_yaml::from_str(yaml).unwrap();
        assert_eq!(config.host, "0.0.0.0");
        assert_eq!(config.port, 9000);
        assert_eq!(config.max_connections, 500);
        assert_eq!(config.max_message_size, 2097152);
        assert!(config.enable_tls);
    }
}
