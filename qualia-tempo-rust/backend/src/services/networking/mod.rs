//! # Responsibility
//! Networking services for WebSocket communication and state streaming.
//!
//! ---
//!
//! COMPLIANCE: ARCHITECTURE.RUST §5.5 - Networking layer for real-time communication.

pub mod connection_manager;
pub mod rate_limiter;
pub mod state_streaming;
pub mod websocket;

// Re-export services for convenience
pub use connection_manager::ConnectionManagerService;
pub use rate_limiter::{RateLimiterService, RateLimiterConfig};
pub use state_streaming::GameStateStreamingService;
pub use websocket::WebSocketService;
