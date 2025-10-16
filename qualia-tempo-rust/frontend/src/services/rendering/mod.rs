//! # Responsibility
//! Rendering services module - wgpu-based graphics pipeline.

// TODO: Fix wgpu 22 SurfaceTarget::Canvas API for WASM
// pub mod kairos_engine;
pub mod gbuffer_pass;
pub mod lighting_pass;
pub mod bloom_pass;
pub mod god_rays_pass;
pub mod composite_pass;
pub mod particle_compute;
pub mod reaction_diffusion_compute;

// pub use kairos_engine::{KairosVisualEngine, KairosEngineConfig};
pub use gbuffer_pass::{GBufferPass, GBufferConfig};
pub use lighting_pass::{LightingPass, LightingConfig};
pub use bloom_pass::{BloomPass, BloomConfig};
pub use god_rays_pass::{GodRaysPass, GodRaysConfig};
pub use composite_pass::{CompositePass, CompositeConfig};
pub use particle_compute::{ParticleComputeService, ParticleComputeConfig, ParticleGPU};
pub use reaction_diffusion_compute::{ReactionDiffusionComputeService, ReactionDiffusionConfig, ColorMapping};
