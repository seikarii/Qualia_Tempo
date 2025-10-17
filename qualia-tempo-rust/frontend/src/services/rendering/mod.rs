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

// Post-processing passes
pub mod dof_pass;
pub mod motion_blur_pass;
pub mod taa_pass;

// SDF renderers
pub mod sdf;

// Utilities
pub mod render_target_pool;
pub mod shader_loader;

// pub use kairos_engine::{KairosVisualEngine, KairosEngineConfig};
pub use gbuffer_pass::{GBufferPass, GBufferConfig};
pub use lighting_pass::{LightingPass, LightingConfig};
pub use bloom_pass::{BloomPass, BloomConfig};
pub use god_rays_pass::{GodRaysPass, GodRaysConfig};
pub use composite_pass::{CompositePass, CompositeConfig};
pub use particle_compute::{ParticleComputeService, ParticleComputeConfig, ParticleGPU};
pub use reaction_diffusion_compute::{ReactionDiffusionComputeService, ReactionDiffusionConfig, ColorMapping};

// Post-processing
pub use dof_pass::{DoFPassService, DoFConfig};
pub use motion_blur_pass::{MotionBlurPassService, MotionBlurConfig};
pub use taa_pass::{TAAPassService, TAAConfig};

// SDF renderers
pub use sdf::{PlayerAvatarSDFService, PlayerSDFConfig, BossAvatarSDFService, BossSDFConfig};

// Utilities
pub use render_target_pool::{RenderTargetPoolService, RenderTargetPoolConfig, PooledTexture};
pub use shader_loader::{ShaderLoaderService, ShaderLoaderConfig};
