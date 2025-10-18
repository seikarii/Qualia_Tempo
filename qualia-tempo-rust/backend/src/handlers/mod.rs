//! # Responsibility
//! HTTP and WebSocket request handlers using Axum.

pub mod websocket_handler;
pub mod health;

pub use websocket_handler::websocket_handler;
pub use health::health_check;
