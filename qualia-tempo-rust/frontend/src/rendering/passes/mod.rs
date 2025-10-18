//! # Responsibility
//! Exports all rendering pass modules for deferred pipeline.
//!
//! ---
//!
//! Rendering passes follow the deferred rendering architecture (VISUALS.RUST.md §2):
//! 1. G-Buffer Pass: Geometry to textures
//! 2. Lighting Pass: Deferred lighting calculations
//! 3. Post-Processing Pass: Bloom, god rays, motion blur (future)
//! 4. Composite Pass: TAA, tonemapping (future)

pub mod gbuffer_pass;
pub mod lighting_pass;

pub use gbuffer_pass::{GBufferPass, GBufferViews};
pub use lighting_pass::LightingPass;
