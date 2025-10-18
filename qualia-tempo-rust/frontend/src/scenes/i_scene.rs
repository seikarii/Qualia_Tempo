//! # Responsibility
//! Defines the IScene trait for all game scenes (ARCHITECTURE.RUST §6.1.5).
//!
//! ---
//!
//! This abstraction decouples scene-specific logic from the rendering engine.
//! Each scene (MenuScene, CombatScene, CinematicScene) implements this trait.

use anyhow::Result;
use async_trait::async_trait;
use wgpu;

/// # Responsibility
/// Interface for all game scenes in Qualia Tempo.
///
/// ---
///
/// Defines the lifecycle contract for scenes: initialization with wgpu resources,
/// per-frame update logic, rendering via wgpu command encoder, and cleanup.
#[async_trait(?Send)]
pub trait IScene {
    /// Initialize scene resources with wgpu device and queue
    ///
    /// # Arguments
    /// - `device`: wgpu Device for creating GPU resources
    /// - `queue`: wgpu Queue for submitting commands
    async fn on_enter(&mut self, device: &wgpu::Device, queue: &wgpu::Queue) -> Result<()>;
    
    /// Update scene logic (called every frame)
    ///
    /// # Arguments
    /// - `dt`: Delta time in seconds since last frame
    async fn update(&mut self, dt: f32) -> Result<()>;
    
    /// Render scene using wgpu command encoder
    ///
    /// # Arguments
    /// - `encoder`: wgpu CommandEncoder for recording render commands
    /// - `view`: wgpu TextureView representing the render target
    async fn render(&self, encoder: &mut wgpu::CommandEncoder, view: &wgpu::TextureView) -> Result<()>;
    
    /// Cleanup scene resources before transition
    async fn on_exit(&mut self) -> Result<()>;
    
    /// Get scene name for debugging and logging
    fn name(&self) -> &str;
}
