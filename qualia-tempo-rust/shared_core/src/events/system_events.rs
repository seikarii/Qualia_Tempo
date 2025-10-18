//! # Responsibility
//! Defines system and lifecycle event types for the `EventBus`.
//!
//! ---
//!
//! This module contains events related to application lifecycle, errors,
//! scene transitions, and system-level notifications.

use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use crate::contracts::scenes::SceneType;

/// # Responsibility
/// System-level events for lifecycle and error handling.
///
/// ---
///
/// These events are emitted by infrastructure services and handle
/// application state, errors, and scene management.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum SystemEvent {
    /// Application started successfully
    ApplicationStarted {
        /// Application version
        version: String,
        /// Startup timestamp (Unix epoch ms)
        timestamp: u64,
    },

    /// Application is shutting down
    ApplicationShutdown {
        /// Shutdown reason
        reason: String,
        /// Shutdown timestamp (Unix epoch ms)
        timestamp: u64,
    },

    /// Scene transition initiated
    SceneTransitionStarted {
        /// Scene being exited
        from_scene: SceneType,
        /// Scene being entered
        to_scene: SceneType,
        /// Transition duration in milliseconds
        duration_ms: u32,
    },

    /// Scene transition completed
    SceneTransitionCompleted {
        /// Active scene
        current_scene: SceneType,
        /// Timestamp when transition completed
        timestamp: u64,
    },

    /// Asset loading started
    AssetLoadingStarted {
        /// Asset identifier
        asset_id: String,
        /// Asset type (e.g., "texture", "audio", "shader")
        asset_type: String,
    },

    /// Asset loading completed
    AssetLoadingCompleted {
        /// Asset identifier
        asset_id: String,
        /// Load time in milliseconds
        load_time_ms: u32,
    },

    /// Asset loading failed
    AssetLoadingFailed {
        /// Asset identifier
        asset_id: String,
        /// Error message
        error: String,
    },

    /// Configuration loaded
    ConfigurationLoaded {
        /// Config file path
        config_path: String,
        /// Number of settings loaded
        settings_count: usize,
    },

    /// Configuration save requested
    ConfigurationSaveRequested {
        /// Config file path
        config_path: String,
    },

    /// Configuration saved successfully
    ConfigurationSaved {
        /// Config file path
        config_path: String,
    },

    /// Network connection established
    NetworkConnected {
        /// Server endpoint
        endpoint: String,
        /// Connection latency in milliseconds
        latency_ms: u32,
    },

    /// Network connection lost
    NetworkDisconnected {
        /// Disconnect reason
        reason: String,
        /// Will attempt reconnect?
        will_retry: bool,
    },

    /// Critical system error occurred
    SystemError {
        /// Error severity ("warning", "error", "critical")
        severity: String,
        /// Error message
        message: String,
        /// Error source/component
        source: String,
        /// Stack trace (if available)
        stack_trace: Option<String>,
    },

    /// Performance metrics update
    PerformanceUpdate {
        /// Current FPS
        fps: u32,
        /// Frame time in milliseconds
        frame_time_ms: f32,
        /// Memory usage in MB
        memory_mb: f32,
    },

    /// User input device connected
    InputDeviceConnected {
        /// Device type ("keyboard", "mouse", "gamepad")
        device_type: String,
        /// Device identifier
        device_id: String,
    },

    /// User input device disconnected
    InputDeviceDisconnected {
        /// Device type
        device_type: String,
        /// Device identifier
        device_id: String,
    },

    /// Leaderboard data updated
    LeaderboardUpdated {
        /// Number of entries
        entry_count: usize,
        /// Last update timestamp
        timestamp: u64,
    },

    /// Telemetry event
    TelemetryEvent {
        /// Event category
        category: String,
        /// Event name
        event_name: String,
        /// Custom properties
        properties: std::collections::HashMap<String, String>,
    },
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_application_started_event() {
        let event = SystemEvent::ApplicationStarted {
            version: "0.1.0".to_string(),
            timestamp: 1_700_000_000_000,
        };

        let json = serde_json::to_string(&event).unwrap();
        let deserialized: SystemEvent = serde_json::from_str(&json).unwrap();

        match deserialized {
            SystemEvent::ApplicationStarted { version, timestamp } => {
                assert_eq!(version, "0.1.0");
                assert_eq!(timestamp, 1_700_000_000_000);
            }
            _ => panic!("Wrong event type"),
        }
    }

    #[test]
    fn test_scene_transition_event() {
        let event = SystemEvent::SceneTransitionStarted {
            from_scene: SceneType::MainMenu,
            to_scene: SceneType::Combat,
            duration_ms: 1000,
        };

        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("sceneTransitionStarted"));
    }

    #[test]
    fn test_system_error_event() {
        let event = SystemEvent::SystemError {
            severity: "critical".to_string(),
            message: "Shader compilation failed".to_string(),
            source: "WgpuRenderService".to_string(),
            stack_trace: Some("line 1\nline 2".to_string()),
        };

        let json = serde_json::to_string(&event).unwrap();
        let deserialized: SystemEvent = serde_json::from_str(&json).unwrap();

        match deserialized {
            SystemEvent::SystemError {
                severity,
                message: _,
                source,
                stack_trace,
            } => {
                assert_eq!(severity, "critical");
                assert_eq!(source, "WgpuRenderService");
                assert!(stack_trace.is_some());
            }
            _ => panic!("Wrong event type"),
        }
    }

    #[test]
    fn test_performance_update_event() {
        let event = SystemEvent::PerformanceUpdate {
            fps: 60,
            frame_time_ms: 16.6,
            memory_mb: 512.0,
        };

        let json = serde_json::to_string(&event).unwrap();
        let deserialized: SystemEvent = serde_json::from_str(&json).unwrap();

        match deserialized {
            SystemEvent::PerformanceUpdate {
                fps,
                frame_time_ms,
                memory_mb,
            } => {
                assert_eq!(fps, 60);
                assert_eq!(frame_time_ms, 16.6);
                assert_eq!(memory_mb, 512.0);
            }
            _ => panic!("Wrong event type"),
        }
    }
}
