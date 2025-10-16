//! # Responsibility
//! Provides network services for WebSocket and HTTP communication.
//!
//! ---
//!
//! This module contains the WebSocket server for real-time client communication.

pub mod websocket_server;

pub use websocket_server::{IWebSocketServer, WebSocketServerService, ConnectionManager};
