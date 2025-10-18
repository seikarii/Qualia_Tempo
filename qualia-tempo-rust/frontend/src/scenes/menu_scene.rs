//! # Responsibility
//! Implements the main menu scene.

use anyhow::Result;
use async_trait::async_trait;
use wgpu;
use crate::scenes::i_scene::IScene;

/// # Responsibility
/// Manages the main menu scene lifecycle and rendering.
///
/// ---
///
/// Handles menu UI, scene transitions to combat or cinematics.
pub struct MenuScene {
    // Menu-specific state (Phase 8: UI elements)
}

impl MenuScene {
    pub fn new() -> Self {
        Self {}
    }
}

impl Default for MenuScene {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait(?Send)]
impl IScene for MenuScene {
    async fn on_enter(&mut self, _device: &wgpu::Device, _queue: &wgpu::Queue) -> Result<()> {
        tracing::info!("Menu scene initialized");
        Ok(())
    }
    
    async fn update(&mut self, _dt: f32) -> Result<()> {
        // Menu input handling (Phase 8)
        Ok(())
    }
    
    async fn render(&self, encoder: &mut wgpu::CommandEncoder, view: &wgpu::TextureView) -> Result<()> {
        // Clear screen to dark gray
        let _render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
            label: Some("Menu Scene Pass"),
            color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                view,
                resolve_target: None,
                ops: wgpu::Operations {
                    load: wgpu::LoadOp::Clear(wgpu::Color {
                        r: 0.1,
                        g: 0.1,
                        b: 0.15,
                        a: 1.0,
                    }),
                    store: wgpu::StoreOp::Store,
                },
            })],
            depth_stencil_attachment: None,
            timestamp_writes: None,
            occlusion_query_set: None,
        });
        
        Ok(())
    }
    
    async fn on_exit(&mut self) -> Result<()> {
        tracing::info!("Menu scene cleaned up");
        Ok(())
    }
    
    fn name(&self) -> &str {
        "MenuScene"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_menu_scene_creation() {
        let scene = MenuScene::new();
        assert_eq!(scene.name(), "MenuScene");
    }
    
    #[test]
    fn test_menu_scene_default() {
        let scene = MenuScene::default();
        assert_eq!(scene.name(), "MenuScene");
    }
}
