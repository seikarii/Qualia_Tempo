//! # Responsibility
//! Defines system and lifecycle event types.
//!
//! ---
//!
//! Contains events for initialization, shutdown, errors, etc.

use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

/// # Responsibility
/// Event for service initialization completion.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ServiceInitialized {
    pub service_name: String,
    pub timestamp: u64,
}

/// # Responsibility
/// Event for critical errors that require attention.
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ErrorOccurred {
    pub error_message: String,
    pub error_type: ErrorType,
    pub service_name: Option<String>,
    pub timestamp: f64,
}

/// # Responsibility
/// Enumerates error severity levels.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ErrorType {
    Fatal,
    Recoverable,
    Warning,
}

/// # Responsibility
/// Event for application shutdown request.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ShutdownRequested {
    pub timestamp: u64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_service_initialized_serialization() {
        let event = ServiceInitialized {
            service_name: "EventBusService".to_string(),
            timestamp: 1000,
        };

        let json = serde_json::to_string(&event).unwrap();
        let deserialized: ServiceInitialized = serde_json::from_str(&json).unwrap();

        assert_eq!(event, deserialized);
    }

    #[test]
    fn test_error_occurred_serialization() {
        let event = ErrorOccurred {
            error_message: "WebSocket connection lost".to_string(),
            error_type: ErrorType::Recoverable,
            service_name: Some("WebSocketService".to_string()),
            timestamp: 5000.0,
        };

        let json = serde_json::to_string(&event).unwrap();
        let deserialized: ErrorOccurred = serde_json::from_str(&json).unwrap();

        assert_eq!(event, deserialized);
    }
}
