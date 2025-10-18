//! # Responsibility
//! Frontend services module.
//!
//! ---
//!
//! Provides all frontend service implementations: scene management, WebSocket
//! communication, and Web Worker bridges.

pub mod scene_manager;
pub mod websocket;
pub mod workers;

pub use scene_manager::SceneManagerService;
pub use websocket::WebSocketService;
