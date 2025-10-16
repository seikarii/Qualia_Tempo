//! # Responsibility
//! HTTP/WebSocket route handlers for the Axum server.

pub mod websocket;
pub mod health;
pub mod api;

pub use websocket::*;
pub use health::*;
pub use api::*;
