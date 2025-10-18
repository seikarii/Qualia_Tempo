//! # Responsibility
//! Frontend entry point for Qualia Tempo WASM application.
//!
//! ---
//!
//! This crate implements the Leptos-based UI and wgpu rendering pipeline
//! for the Qualia Tempo frontend (ARCHITECTURE.RUST §6).

// Module declarations
pub mod scenes;
pub mod services;
pub mod rendering;

// Re-exports
pub use scenes::{CombatScene, IScene};
pub use services::SceneManagerService;
pub use rendering::WgpuRenderer;

// WASM initialization
use wasm_bindgen::prelude::*;

/// # Responsibility
/// WASM entry point - initializes panic hook and tracing.
#[wasm_bindgen(start)]
pub fn main() {
    console_error_panic_hook::set_once();
    
    tracing_wasm::set_as_global_default();
    
    tracing::info!("Qualia Tempo frontend initialized");
}
