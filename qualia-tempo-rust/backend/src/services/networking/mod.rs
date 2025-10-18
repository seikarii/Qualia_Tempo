//! # Responsibility
//! Aggregates networking service implementations.

pub mod websocket;
pub mod state_streaming;

pub use websocket::WebSocketService;
pub use state_streaming::GameStateStreamingService;
