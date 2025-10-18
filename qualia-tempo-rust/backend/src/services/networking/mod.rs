//! # Responsibility
//! Aggregates networking service implementations.

pub mod websocket;
pub mod state_streaming;
pub mod connection_manager;

pub use websocket::WebSocketService;
pub use state_streaming::GameStateStreamingService;
pub use connection_manager::ConnectionManagerService;
