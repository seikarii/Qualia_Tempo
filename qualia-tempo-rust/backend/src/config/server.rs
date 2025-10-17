//! # Responsibility
//! Backend server configuration structure.
//!
//! ---
//!
//! Defines configuration for the Axum WebSocket server, including
//! host, port, CORS settings, and connection limits.

use serde::{Deserialize, Serialize};

/// # Responsibility
/// Server configuration for backend.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
    pub enable_cors: bool,
    pub max_connections: usize,
}

impl Default for ServerConfig {
    fn default() -> Self {
        Self {
            host: "127.0.0.1".to_string(),
            port: 3000,
            enable_cors: true,
            max_connections: 1000,
        }
    }
}

/// # Responsibility
/// WebSocket configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebSocketConfig {
    pub max_message_size: usize,
    pub max_frame_size: usize,
    pub heartbeat_interval_ms: u64,
}

impl Default for WebSocketConfig {
    fn default() -> Self {
        Self {
            max_message_size: 1024 * 1024, // 1 MB
            max_frame_size: 64 * 1024,     // 64 KB
            heartbeat_interval_ms: 30000,  // 30 seconds
        }
    }
}

/// # Responsibility
/// Metronome configuration for rhythm sync.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MetronomeConfig {
    pub default_bpm: f32,
    pub lookahead_ms: f64,
    pub schedule_ahead_time: f64,
}

impl Default for MetronomeConfig {
    fn default() -> Self {
        Self {
            default_bpm: 120.0,
            lookahead_ms: 25.0,
            schedule_ahead_time: 0.1,
        }
    }
}
