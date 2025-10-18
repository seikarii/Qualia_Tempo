//! # Responsibility
//! Manages rendering subsystem with deferred rendering pipeline.
//!
//! ---
//!
//! Implements complete deferred rendering architecture (VISUALS.RUST.md):
//! - G-Buffer pass for geometry
//! - Lighting pass for deferred shading
//! - Post-processing effects (bloom, god rays, motion blur)
//! - Composite and TAA for final output

pub mod renderer;
pub mod passes;

pub use renderer::WgpuRenderer;
pub use passes::{GBufferPass, GBufferViews, LightingPass, PostProcessPass, CompositePass};
