//! # Responsibility
//! Implements the cinematic scene for story sequences.
//!
//! ---
//!
//! This scene handles narrative cutscenes, including Charlie Hellsinger's story beats,
//! lyric displays synchronized with music, and cinematic transitions between combat phases.

use anyhow::Result;
use async_trait::async_trait;
use wgpu;
use tracing::{info, debug};
use crate::scenes::i_scene::IScene;

/// # Responsibility
/// Manages the cinematic scene lifecycle and rendering.
///
/// ---
///
/// Handles story cutscenes, narrative sequences, and transitions between scenes.
/// Phase 7: Basic scene structure with fade animations.
/// Phase 8: Full video/animation playback system.
/// Phase 9: Synchronized lyric display with audio timeline.
pub struct CinematicScene {
    pub(crate) playback_time: f32,
    duration: f32,
    fade_in_complete: bool,
    is_skippable: bool,
}

impl CinematicScene {
    /// Create a new cinematic scene with specified duration
    pub fn new() -> Self {
        Self::with_duration(5.0) // Default 5-second cinematic
    }

    /// Create cinematic with custom duration
    pub fn with_duration(duration: f32) -> Self {
        info!("CinematicScene created with duration: {}s", duration);
        Self {
            playback_time: 0.0,
            duration,
            fade_in_complete: false,
            is_skippable: false,
        }
    }

    /// Check if cinematic has finished playing
    pub fn is_complete(&self) -> bool {
        self.playback_time >= self.duration
    }

    /// Calculate current fade alpha for smooth transitions
    fn get_fade_alpha(&self) -> f64 {
        const FADE_IN_DURATION: f32 = 1.0;
        const FADE_OUT_DURATION: f32 = 1.0;

        if self.playback_time < FADE_IN_DURATION {
            // Fade in
            (self.playback_time / FADE_IN_DURATION) as f64
        } else if self.playback_time > self.duration - FADE_OUT_DURATION {
            // Fade out
            let remaining = self.duration - self.playback_time;
            (remaining / FADE_OUT_DURATION) as f64
        } else {
            // Full opacity
            1.0
        }
    }
}

impl Default for CinematicScene {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait(?Send)]
impl IScene for CinematicScene {
    async fn on_enter(&mut self, _device: &wgpu::Device, _queue: &wgpu::Queue) -> Result<()> {
        info!("Cinematic scene initialized - starting playback");
        
        self.playback_time = 0.0;
        self.fade_in_complete = false;
        self.is_skippable = true;
        
        // Phase 8: Load cinematic resources
        // - Load video textures
        // - Prepare subtitle data
        // - Queue audio track
        
        Ok(())
    }
    
    async fn update(&mut self, dt: f32) -> Result<()> {
        self.playback_time += dt;
        
        if !self.fade_in_complete && self.playback_time > 1.0 {
            self.fade_in_complete = true;
            debug!("Cinematic fade-in complete");
        }
        
        if self.is_complete() {
            debug!("Cinematic playback complete at {:.2}s", self.playback_time);
        }
        
        // Phase 8: Update cinematic logic
        // - Advance video frame
        // - Update subtitle timing
        // - Handle skip input
        
        // Phase 9: Synchronize audio
        // - Update lyric display based on audio timeline
        // - Trigger emotional music cues
        
        Ok(())
    }
    
    async fn render(&self, encoder: &mut wgpu::CommandEncoder, view: &wgpu::TextureView) -> Result<()> {
        let alpha = self.get_fade_alpha();
        
        // Render black background with fade
        let _render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
            label: Some("Cinematic Scene Pass"),
            color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                view,
                resolve_target: None,
                ops: wgpu::Operations {
                    load: wgpu::LoadOp::Clear(wgpu::Color {
                        r: 0.0,
                        g: 0.0,
                        b: 0.0,
                        a: alpha,
                    }),
                    store: wgpu::StoreOp::Store,
                },
            })],
            depth_stencil_attachment: None,
            timestamp_writes: None,
            occlusion_query_set: None,
        });
        
        // Phase 8: Render cinematic content
        // - Render video frame
        // - Render subtitles/lyrics
        // - Render skip prompt if applicable
        
        Ok(())
    }
    
    async fn on_exit(&mut self) -> Result<()> {
        info!(
            "Cinematic scene exiting - Played: {:.2}s / {:.2}s",
            self.playback_time, self.duration
        );
        
        // Phase 8: Cleanup resources
        // - Release video textures
        // - Stop audio playback
        
        Ok(())
    }
    
    fn name(&self) -> &str {
        "CinematicScene"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cinematic_scene_creation() {
        let scene = CinematicScene::new();
        assert_eq!(scene.name(), "CinematicScene");
        assert_eq!(scene.playback_time, 0.0);
        assert!(!scene.is_complete());
    }
    
    #[test]
    fn test_cinematic_scene_default() {
        let scene = CinematicScene::default();
        assert_eq!(scene.name(), "CinematicScene");
    }

    #[test]
    fn test_cinematic_with_custom_duration() {
        let scene = CinematicScene::with_duration(10.0);
        assert_eq!(scene.duration, 10.0);
    }

    #[test]
    fn test_cinematic_completion() {
        let mut scene = CinematicScene::with_duration(2.0);
        assert!(!scene.is_complete());
        
        scene.playback_time = 2.5;
        assert!(scene.is_complete());
    }

    #[test]
    fn test_fade_alpha_at_start() {
        let scene = CinematicScene::with_duration(5.0);
        assert_eq!(scene.get_fade_alpha(), 0.0);
    }

    #[test]
    fn test_fade_alpha_midway() {
        let mut scene = CinematicScene::with_duration(5.0);
        scene.playback_time = 2.5;
        assert_eq!(scene.get_fade_alpha(), 1.0);
    }

    #[test]
    fn test_fade_alpha_at_end() {
        let mut scene = CinematicScene::with_duration(5.0);
        scene.playback_time = 5.0;
        assert!((scene.get_fade_alpha() - 0.0).abs() < 0.01);
    }
}
