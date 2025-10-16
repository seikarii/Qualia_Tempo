//! # Responsibility
//! Frontend WASM library for Qualia Tempo client.

#![warn(missing_docs)]
#![deny(clippy::unwrap_used)]
#![deny(clippy::expect_used)]

/// UI components (Leptos)
pub mod components;
/// Global state management
pub mod state;
/// Frontend services (WebSocket client, audio engine)
pub mod services;
/// wgpu rendering pipeline
pub mod rendering;
/// Web workers for audio processing
pub mod workers;
/// Leptos hooks and utilities
pub mod hooks;
/// Utility functions
pub mod utils;
