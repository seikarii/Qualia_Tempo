//! # Responsibility
//! Defines the IScene trait for all game scenes (ARCHITECTURE.RUST §6.1.5).
//!
//! ---
//!
//! This abstraction decouples scene-specific logic from the rendering engine.
//! Each scene (MenuScene, CombatScene, CinematicScene) implements this trait.
//!
//! PHASE 7 NOTE: wgpu parameters will be added to methods in Phase 8.

use anyhow::Result;
use async_trait::async_trait;

/// # Responsibility
/// Interface for all game scenes in Qualia Tempo.
#[async_trait(?Send)]
pub trait IScene {
    /// Initialize scene resources (Phase 8: add wgpu device/queue params)
    async fn on_enter(&mut self) -> Result<()>;
    
    /// Update scene logic (called every frame)
    async fn update(&mut self, dt: f32) -> Result<()>;
    
    /// Render scene (Phase 8: add wgpu encoder/view params)
    async fn render(&self) -> Result<()>;
    
    /// Cleanup scene resources
    async fn on_exit(&mut self) -> Result<()>;
    
    /// Get scene name for debugging
    fn name(&self) -> &str;
}
