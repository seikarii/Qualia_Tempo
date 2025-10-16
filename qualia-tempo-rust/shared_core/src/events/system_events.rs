//! # Responsibility
//! Defines system/lifecycle event types for application state management.
//!
//! ---
//!
//! This module implements system-level events for server lifecycle,
//! connection management, and error reporting.

use serde::{Deserialize, Serialize};

/// # Responsibility
/// Event signaling application startup completion.
///
/// ---
///
/// Emitted by ApplicationInitializerService after all services are initialized.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ApplicationStartedEvent {
    pub timestamp: u64, // Unix timestamp in milliseconds
}

/// # Responsibility
/// Event signaling graceful application shutdown initiated.
///
/// ---
///
/// Consumed by all services to perform cleanup and flush state.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ApplicationShutdownEvent {
    pub reason: ShutdownReason,
    pub timestamp: u64,
}

/// # Responsibility
/// Defines the reason for application shutdown.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ShutdownReason {
    UserRequested,
    FatalError,
    SignalReceived,
    Maintenance,
}

/// # Responsibility
/// Event signaling a client WebSocket connection established.
///
/// ---
///
/// Emitted by WebSocketService when a player connects.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ClientConnectedEvent {
    pub connection_id: String,
    pub player_id: Option<String>, // None if unauthenticated
    pub timestamp: u64,
}

/// # Responsibility
/// Event signaling a client WebSocket disconnection.
///
/// ---
///
/// Triggers cleanup of player state and combat session termination.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ClientDisconnectedEvent {
    pub connection_id: String,
    pub reason: DisconnectReason,
    pub timestamp: u64,
}

/// # Responsibility
/// Defines the reason for client disconnection.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum DisconnectReason {
    ClientClosed,
    Timeout,
    ServerShutdown,
    ProtocolError,
    Kicked,
}

/// # Responsibility
/// Event signaling a non-fatal error occurred.
///
/// ---
///
/// Used for monitoring and alerting, does not terminate the application.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ErrorOccurredEvent {
    pub error_code: String,
    pub error_message: String,
    pub service_name: String,
    pub timestamp: u64,
}

/// # Responsibility
/// Event signaling configuration hot-reload completed.
///
/// ---
///
/// Allows services to reload configuration without restarting the application.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ConfigurationReloadedEvent {
    pub changed_keys: Vec<String>,
    pub timestamp: u64,
}

/// # Responsibility
/// Aggregates all system event types.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum SystemEvent {
    ApplicationStarted(ApplicationStartedEvent),
    ApplicationShutdown(ApplicationShutdownEvent),
    ClientConnected(ClientConnectedEvent),
    ClientDisconnected(ClientDisconnectedEvent),
    ErrorOccurred(ErrorOccurredEvent),
    ConfigurationReloaded(ConfigurationReloadedEvent),
}
