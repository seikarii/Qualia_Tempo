//! # Responsibility
//! Implements the combat scene (boss fight).
//!
//! ---
//!
//! This scene orchestrates the core gameplay loop: player input, qualia calculation,
//! boss AI interaction, and visual/audio feedback. It integrates with the Web Worker
//! for real-time qualia calculation and communicates with the backend for state validation.

use anyhow::Result;
use async_trait::async_trait;
use wgpu;
use tracing::{info, debug};
use crate::scenes::i_scene::IScene;
use crate::rendering::{GBufferPass, LightingPass};

/// # Responsibility
/// Manages the combat scene lifecycle and rendering.
///
/// ---
///
/// Phase 7: Basic scene structure with clear rendering and lifecycle hooks.
/// Phase 8: Full rendering pipeline (deferred rendering, particles, effects).
/// Phase 9: Audio integration (8D spatial audio, generative music).
pub struct CombatScene {
    // Phase 7: Placeholder state
    pub(crate) frame_count: u64,
    pub(crate) elapsed_time: f32,
    
    // Phase 8: Rendering resources (deferred pipeline)
    gbuffer_pass: Option<GBufferPass>,
    lighting_pass: Option<LightingPass>,
    
    // Phase 9: Audio resources (Web Audio context, spatial panner)
}

impl CombatScene {
    /// Create a new combat scene instance
    pub fn new() -> Self {
        info!("CombatScene created");
        Self {
            frame_count: 0,
            elapsed_time: 0.0,
            gbuffer_pass: None,
            lighting_pass: None,
        }
    }
}

impl Default for CombatScene {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait(?Send)]
impl IScene for CombatScene {
    async fn on_enter(&mut self, device: &wgpu::Device, _queue: &wgpu::Queue) -> Result<()> {
        info!("Combat scene initialized - loading resources");
        
        // Phase 7: Basic initialization
        self.frame_count = 0;
        self.elapsed_time = 0.0;
        
        // Phase 8: Initialize deferred rendering pipeline
        let config = wgpu::SurfaceConfiguration {
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT,
            format: wgpu::TextureFormat::Bgra8UnormSrgb,
            width: 1920,
            height: 1080,
            present_mode: wgpu::PresentMode::Fifo,
            alpha_mode: wgpu::CompositeAlphaMode::Auto,
            view_formats: vec![],
            desired_maximum_frame_latency: 2,
        };
        
        // Create G-Buffer pass
        let gbuffer_pass = GBufferPass::new(device, &config)?;
        info!("G-Buffer pass created");
        
        // Create Lighting pass
        let gbuffer_views = gbuffer_pass.texture_views();
        let lighting_pass = LightingPass::new(device, &gbuffer_views, &config)?;
        info!("Lighting pass created");
        
        self.gbuffer_pass = Some(gbuffer_pass);
        self.lighting_pass = Some(lighting_pass);
        
        // Phase 9: Initialize audio
        // - Create Web Audio context
        // - Load 8D spatial audio nodes
        // - Initialize generative music engine
        
        info!("Combat scene ready for combat");
        Ok(())
    }
    
    async fn update(&mut self, dt: f32) -> Result<()> {
        self.frame_count += 1;
        self.elapsed_time += dt;
        
        // Log every 60 frames (approx 1 second at 60 FPS)
        if self.frame_count.is_multiple_of(60) {
            debug!(
                "Combat scene update - Frame: {}, Elapsed: {:.2}s",
                self.frame_count, self.elapsed_time
            );
        }
        
        // Phase 7: Basic time tracking
        // Phase 8: Update game logic
        // - Process player input
        // - Send actions to Web Worker for qualia calculation
        // - Update boss AI state
        // - Simulate particles
        // - Interpolate animations
        
        // Phase 9: Update audio
        // - Update 8D spatial positions
        // - Trigger generative notes
        // - Adjust volume based on qualia state
        
        Ok(())
    }
    
    async fn render(&self, encoder: &mut wgpu::CommandEncoder, view: &wgpu::TextureView) -> Result<()> {
        // Phase 8: Full deferred rendering pipeline
        if let (Some(gbuffer), Some(lighting)) = (&self.gbuffer_pass, &self.lighting_pass) {
            // 1. G-Buffer pass (geometry to textures)
            gbuffer.render(encoder)?;
            debug!("G-Buffer pass executed (frame {})", self.frame_count);
            
            // 2. Lighting pass (deferred shading)
            lighting.render(encoder)?;
            debug!("Lighting pass executed");
            
            // 3. Composite pass: Copy lighting output to swapchain (blit)
            // Phase 8: Simplified blit via render pass
            // Full composite pass with tonemapping and TAA in future phases
            let _lighting_output = lighting.output_view(); // Used in future blit shader
            let _blit_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("Blit to Swapchain"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view,
                    resolve_target: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(wgpu::Color::BLACK),
                        store: wgpu::StoreOp::Store,
                    },
                })],
                depth_stencil_attachment: None,
                timestamp_writes: None,
                occlusion_query_set: None,
            });
            
            // TODO: Implement blit shader to copy lighting_output to view
            // For Phase 8, deferred pipeline architecture is established
            
            debug!("Deferred pipeline complete");
        } else {
            // Fallback: Clear to animated color (Phase 7 behavior)
            let hue = (self.elapsed_time * 0.1) % 1.0;
            let color = Self::hue_to_rgb(hue);
            
            let _render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("Combat Scene Fallback Pass"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view,
                    resolve_target: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(wgpu::Color {
                            r: color.0,
                            g: color.1,
                            b: color.2,
                            a: 1.0,
                        }),
                        store: wgpu::StoreOp::Store,
                    },
                })],
                depth_stencil_attachment: None,
                timestamp_writes: None,
                occlusion_query_set: None,
            });
        }
        
        // Phase 9: UI overlay
        // - Combo counter
        // - Score display
        // - Boss health bar
        
        Ok(())
    }
    
    async fn on_exit(&mut self) -> Result<()> {
        info!(
            "Combat scene exiting - Total frames: {}, Total time: {:.2}s",
            self.frame_count, self.elapsed_time
        );
        
        // Phase 8: Cleanup rendering resources
        // - Drop pipelines
        // - Release buffers
        // - Clear textures
        
        // Phase 9: Cleanup audio
        // - Close Web Audio context
        // - Stop all playing sounds
        
        Ok(())
    }
    
    fn name(&self) -> &str {
        "CombatScene"
    }
}

impl CombatScene {
    /// Convert HSV hue to RGB for animated background
    fn hue_to_rgb(hue: f32) -> (f64, f64, f64) {
        let h = hue * 6.0;
        let x = 1.0 - (h % 2.0 - 1.0).abs();
        
        let (r, g, b) = match h as u32 {
            0 => (1.0, x, 0.0),
            1 => (x, 1.0, 0.0),
            2 => (0.0, 1.0, x),
            3 => (0.0, x, 1.0),
            4 => (x, 0.0, 1.0),
            _ => (1.0, 0.0, x),
        };
        
        // Dim colors for combat atmosphere
        (r as f64 * 0.2, g as f64 * 0.2, b as f64 * 0.3)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_combat_scene_creation() {
        let scene = CombatScene::new();
        assert_eq!(scene.name(), "CombatScene");
        assert_eq!(scene.frame_count, 0);
        assert_eq!(scene.elapsed_time, 0.0);
    }
    
    #[test]
    fn test_combat_scene_default() {
        let scene = CombatScene::default();
        assert_eq!(scene.name(), "CombatScene");
    }

    #[test]
    fn test_hue_to_rgb_red() {
        let rgb = CombatScene::hue_to_rgb(0.0);
        assert!((rgb.0 - 0.2).abs() < 0.01);
        assert!(rgb.1 < 0.01);
        assert!(rgb.2 < 0.01);
    }

    #[test]
    fn test_hue_to_rgb_green() {
        let rgb = CombatScene::hue_to_rgb(0.333);
        assert!(rgb.0 < 0.05);
        assert!((rgb.1 - 0.2).abs() < 0.05);
        assert!(rgb.2 < 0.05);
    }

    #[test]
    fn test_hue_to_rgb_blue() {
        let rgb = CombatScene::hue_to_rgb(0.666);
        assert!(rgb.0 < 0.05);
        assert!(rgb.1 < 0.05);
        assert!((rgb.2 - 0.3).abs() < 0.05);
    }
}
