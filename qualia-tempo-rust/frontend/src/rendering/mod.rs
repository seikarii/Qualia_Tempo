//! # Responsibility
//! Manages rendering subsystem with deferred rendering pipeline.
//!
//! ---
//!
//! Implements complete deferred rendering architecture (VISUALS.RUST.md):
//! - G-Buffer pass for geometry
//! - Lighting pass for deferred shading
//! - Post-processing effects
//! - Composite and TAA

pub mod renderer;
pub mod passes;

pub use renderer::WgpuRenderer;
pub use passes::{GBufferPass, GBufferViews, LightingPass};
