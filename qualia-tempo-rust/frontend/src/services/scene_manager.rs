//! # Responsibility
//! Manages scene transitions and lifecycle (ARCHITECTURE.RUST §6.1.5, BLUEPRINT.RUST #51).

use anyhow::Result;
use tracing::{info, instrument};
use crate::scenes::IScene;

/// # Responsibility
/// Orchestrates scene transitions and manages current scene lifecycle.
///
/// ---
///
/// PHASE 7 NOTE: Full wgpu integration will be added in Phase 8.
/// This provides the scene management architecture.
pub struct SceneManagerService {
    current_scene: Option<Box<dyn IScene>>,
}

impl SceneManagerService {
    pub fn new() -> Self {
        Self {
            current_scene: None,
        }
    }
    
    #[instrument(skip(self, new_scene))]
    pub async fn transition_to(&mut self, new_scene: Box<dyn IScene>) -> Result<()> {
        // Exit current scene
        if let Some(ref mut scene) = self.current_scene {
            info!("Exiting scene: {}", scene.name());
            scene.on_exit().await?;
        }
        
        // Enter new scene (wgpu params will be added in Phase 8)
        info!("Entering scene: {}", new_scene.name());
        // Phase 8: new_scene.on_enter(&device, &queue).await?;
        
        self.current_scene = Some(new_scene);
        
        Ok(())
    }
    
    pub async fn update(&mut self, dt: f32) -> Result<()> {
        if let Some(ref mut scene) = self.current_scene {
            scene.update(dt).await?;
        }
        Ok(())
    }
    
    // Phase 8: Add render method with wgpu encoder
    
    pub fn current_scene_name(&self) -> Option<&str> {
        self.current_scene.as_ref().map(|s| s.name())
    }
}

impl Default for SceneManagerService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_scene_manager_no_initial_scene() {
        // Cannot test without wgpu::Device which requires async runtime
        // This will be integration-tested in Phase 8
    }
}
