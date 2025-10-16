//! # Responsibility
//! Rendering-related services for particle simulation and shader introspection.
//!
//! ---
//!
//! This module contains services that handle compute-heavy rendering tasks,
//! offloading work from the network I/O threads to dedicated Tokio task pools.

pub mod particle_pool;
pub mod shader_introspector;

pub use particle_pool::{
    ParticlePoolService,
    IParticlePoolService,
    ParticlePoolConfig,
    ParticleWorkRequest,
    ParticleWorkResult,
};

pub use shader_introspector::{
    ShaderIntrospectionService,
    IShaderIntrospectionService,
    ShaderIntrospectionConfig,
    ShaderMetadata,
    ShaderType,
};
