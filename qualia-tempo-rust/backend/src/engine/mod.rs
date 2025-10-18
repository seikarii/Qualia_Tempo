//! # Responsibility
//! Exports backend engine modules (particle physics, compute pools).
//!
//! ---
//!
//! This module provides high-performance engines that use tokio::spawn_blocking
//! to offload CPU-intensive work from the async runtime.

pub mod particle_engine;

pub use particle_engine::{IParticleEngine, QualiaParticleEngine};
