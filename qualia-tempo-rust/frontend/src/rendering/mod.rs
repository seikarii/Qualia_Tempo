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
//! - Texture atlasing for optimized draw calls (PHASE 11)

pub mod passes;
pub mod renderer;
pub mod texture_atlas;

pub use passes::{CompositePass, GBufferPass, GBufferViews, LightingPass, PostProcessPass};
pub use renderer::WgpuRenderer;
pub use texture_atlas::{AtlasRegion, TextureAtlasConfig, TextureAtlasManager};
