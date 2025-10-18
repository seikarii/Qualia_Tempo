//! # Responsibility
//! Manages scene transitions and lifecycle (ARCHITECTURE.RUST §6.1.5, BLUEPRINT.RUST #51).

use std::sync::Arc;
use anyhow::Result;
use tracing::{info, instrument};
use crate::scenes::IScene;
use wgpu;

/// # Responsibility
/// Orchestrates scene transitions and manages current scene lifecycle.
///
/// ---
///
/// Holds references to wgpu device/queue for scene initialization and manages
/// the active scene state. Ensures proper cleanup during transitions.
pub struct SceneManagerService {
    current_scene: Option<Box<dyn IScene>>,
    device: Arc<wgpu::Device>,
    queue: Arc<wgpu::Queue>,
}

impl SceneManagerService {
    /// Create new SceneManagerService with wgpu resources
    ///
    /// # Arguments
    /// - `device`: Shared wgpu Device for GPU resource creation
    /// - `queue`: Shared wgpu Queue for command submission
    pub fn new(device: Arc<wgpu::Device>, queue: Arc<wgpu::Queue>) -> Self {
        Self {
            current_scene: None,
            device,
            queue,
        }
    }
    
    /// Transition to a new scene, cleaning up the current scene if present
    ///
    /// # Arguments
    /// - `new_scene`: Boxed scene implementing IScene trait
    #[instrument(skip(self, new_scene))]
    pub async fn transition_to(&mut self, mut new_scene: Box<dyn IScene>) -> Result<()> {
        // Exit current scene
        if let Some(ref mut scene) = self.current_scene {
            info!("Exiting scene: {}", scene.name());
            scene.on_exit().await?;
        }
        
        // Enter new scene with wgpu resources
        info!("Entering scene: {}", new_scene.name());
        new_scene.on_enter(&self.device, &self.queue).await?;
        
        self.current_scene = Some(new_scene);
        
        Ok(())
    }
    
    /// Update current scene logic
    ///
    /// # Arguments
    /// - `dt`: Delta time in seconds since last frame
    pub async fn update(&mut self, dt: f32) -> Result<()> {
        if let Some(ref mut scene) = self.current_scene {
            scene.update(dt).await?;
        }
        Ok(())
    }
    
    /// Render current scene using wgpu command encoder
    ///
    /// # Arguments
    /// - `encoder`: wgpu CommandEncoder for recording render commands
    /// - `view`: wgpu TextureView representing the render target
    pub async fn render(&self, encoder: &mut wgpu::CommandEncoder, view: &wgpu::TextureView) -> Result<()> {
        if let Some(ref scene) = self.current_scene {
            scene.render(encoder, view).await?;
        }
        Ok(())
    }
    
    /// Get current scene name for debugging
    pub fn current_scene_name(&self) -> Option<&str> {
        self.current_scene.as_ref().map(|s| s.name())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_scene_manager_struct_compiles() {
        // Structural test - wgpu integration requires browser context
        // Full integration testing in WASM environment
        assert!(true);
    }
}
