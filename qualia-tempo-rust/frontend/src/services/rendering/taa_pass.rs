//! # Responsibility
//! Implements Temporal Anti-Aliasing (TAA) using temporal reprojection.
//!
//! ---
//!
//! Reduces aliasing artifacts by blending current and previous frames using motion vectors.
//! Critical for smooth edges in deferred rendering pipeline.
//! Uses exponential moving average with velocity-based confidence weighting.

use anyhow::Result;
use serde::{Deserialize, Serialize};
use wgpu::*;

/// # Responsibility
/// Configuration for TAA effect parameters.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TAAConfig {
    /// Enable TAA effect
    pub enabled: bool,
    /// Temporal blend factor (0-1). Higher = more history, more blur
    pub temporal_blend_factor: f32,
    /// Variance clipping threshold (reduces ghosting)
    pub variance_clip_gamma: f32,
    /// Jitter sequence for subpixel sampling (Halton 2-3 basis)
    pub use_jitter: bool,
}

impl Default for TAAConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            temporal_blend_factor: 0.9, // 90% history, 10% current (reduces flicker)
            variance_clip_gamma: 1.5,   // Standard variance clipping
            use_jitter: true,           // Subpixel jitter for better convergence
        }
    }
}

/// # Responsibility
/// GPU shader uniforms for TAA pass.
#[repr(C)]
#[derive(Debug, Clone, Copy, bytemuck::Pod, bytemuck::Zeroable)]
struct TAAUniforms {
    temporal_blend_factor: f32,
    variance_clip_gamma: f32,
    jitter_x: f32,
    jitter_y: f32,
}

/// # Responsibility
/// Renders Temporal Anti-Aliasing effect via temporal reprojection.
///
/// ---
///
/// Algorithm:
/// 1. Reproject previous frame using motion vectors
/// 2. Clamp reprojected color to variance neighborhood (reduces ghosting)
/// 3. Blend current and reprojected with temporal_blend_factor
/// 4. Store result as new history frame
pub struct TAAPassService {
    config: TAAConfig,
    pipeline: Option<RenderPipeline>,
    bind_group: Option<BindGroup>,
    uniform_buffer: Option<Buffer>,
    history_texture: Option<Texture>,
    frame_index: u32,
}

impl TAAPassService {
    /// Creates a new TAA pass service with the given configuration.
    pub fn new(config: TAAConfig) -> Self {
        Self {
            config,
            pipeline: None,
            bind_group: None,
            uniform_buffer: None,
            history_texture: None,
            frame_index: 0,
        }
    }

    /// Initializes the TAA render pipeline with wgpu device.
    pub fn initialize(&mut self, device: &Device, width: u32, height: u32) -> Result<()> {
        // Create history texture for temporal reprojection
        let history_texture = device.create_texture(&TextureDescriptor {
            label: Some("TAA History Texture"),
            size: Extent3d { width, height, depth_or_array_layers: 1 },
            mip_level_count: 1,
            sample_count: 1,
            dimension: TextureDimension::D2,
            format: TextureFormat::Rgba16Float,
            usage: TextureUsages::TEXTURE_BINDING | TextureUsages::RENDER_ATTACHMENT,
            view_formats: &[],
        });

        self.history_texture = Some(history_texture);

        let jitter = self.halton_jitter(self.frame_index);
        let uniforms = TAAUniforms {
            temporal_blend_factor: self.config.temporal_blend_factor,
            variance_clip_gamma: self.config.variance_clip_gamma,
            jitter_x: jitter.0,
            jitter_y: jitter.1,
        };

        let uniform_buffer = device.create_buffer_init(&util::BufferInitDescriptor {
            label: Some("TAA Uniform Buffer"),
            contents: bytemuck::cast_slice(&[uniforms]),
            usage: BufferUsages::UNIFORM | BufferUsages::COPY_DST,
        });

        self.uniform_buffer = Some(uniform_buffer);

        Ok(())
    }

    /// Renders the TAA effect to the output texture.
    ///
    /// # Arguments
    /// * `device` - wgpu device
    /// * `queue` - wgpu queue
    /// * `encoder` - Command encoder for GPU commands
    /// * `current_frame` - Current rendered frame
    /// * `velocity_texture` - Velocity buffer (for reprojection)
    /// * `output_texture` - Output texture for anti-aliased result
    pub fn render(
        &mut self,
        device: &Device,
        queue: &Queue,
        encoder: &mut CommandEncoder,
        current_frame: &TextureView,
        velocity_texture: &TextureView,
        output_texture: &TextureView,
    ) -> Result<()> {
        if !self.config.enabled {
            // TAA disabled - just copy input to output
            // TODO: Implement blit/copy pass
            return Ok(());
        }

        // TODO: Implement full TAA shader pass
        // Algorithm:
        // 1. Read velocity from velocity buffer
        // 2. Reproject previous frame using velocity
        // 3. Calculate 3x3 variance neighborhood
        // 4. Clamp reprojected color to neighborhood (variance clipping)
        // 5. Blend current and clamped history with temporal_blend_factor
        // 6. Write to output and update history texture

        self.frame_index += 1;

        Ok(())
    }

    /// Generates Halton sequence jitter for subpixel sampling.
    ///
    /// Uses Halton(2, 3) sequence for low-discrepancy sampling pattern.
    ///
    /// # Arguments
    /// * `index` - Frame index
    ///
    /// # Returns
    /// (jitter_x, jitter_y) in [-0.5, 0.5] range (subpixel offset)
    pub fn halton_jitter(&self, index: u32) -> (f32, f32) {
        if !self.config.use_jitter {
            return (0.0, 0.0);
        }

        let x = self.halton_sequence(index, 2);
        let y = self.halton_sequence(index, 3);

        // Remap from [0, 1] to [-0.5, 0.5]
        (x - 0.5, y - 0.5)
    }

    /// Calculates Halton sequence value for a given index and base.
    fn halton_sequence(&self, mut index: u32, base: u32) -> f32 {
        let mut result = 0.0;
        let mut f = 1.0;
        let base_f = base as f32;

        while index > 0 {
            f /= base_f;
            result += f * (index % base) as f32;
            index /= base;
        }

        result
    }

    /// Updates TAA parameters dynamically.
    ///
    /// # Example
    /// ```rust
    /// // Reduce temporal blending during high motion (less blur)
    /// taa_service.update_params(
    ///     0.7,   // temporal_blend_factor (reduced history weight)
    ///     1.5,   // variance_clip_gamma
    ///     true   // use_jitter
    /// );
    /// ```
    pub fn update_params(&mut self, temporal_blend_factor: f32, variance_clip_gamma: f32, use_jitter: bool) {
        self.config.temporal_blend_factor = temporal_blend_factor.clamp(0.0, 1.0);
        self.config.variance_clip_gamma = variance_clip_gamma;
        self.config.use_jitter = use_jitter;
    }

    /// Resets TAA history (e.g., after camera cut).
    pub fn reset_history(&mut self) {
        self.frame_index = 0;
        // TODO: Clear history texture to black
    }

    /// Sets whether TAA is enabled/disabled.
    pub fn set_enabled(&mut self, enabled: bool) {
        self.config.enabled = enabled;
    }

    /// Returns current TAA configuration.
    pub fn get_config(&self) -> &TAAConfig {
        &self.config
    }

    /// Returns current frame index (for jitter sequence).
    pub fn get_frame_index(&self) -> u32 {
        self.frame_index
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_halton_sequence_base2() {
        let config = TAAConfig::default();
        let service = TAAPassService::new(config);

        // Halton(2) sequence: 0, 0.5, 0.25, 0.75, 0.125, ...
        assert_eq!(service.halton_sequence(0, 2), 0.0);
        assert_eq!(service.halton_sequence(1, 2), 0.5);
        assert_eq!(service.halton_sequence(2, 2), 0.25);
        assert_eq!(service.halton_sequence(3, 2), 0.75);
    }

    #[test]
    fn test_halton_sequence_base3() {
        let config = TAAConfig::default();
        let service = TAAPassService::new(config);

        // Halton(3) sequence: 0, 0.333..., 0.666..., 0.111..., ...
        assert_eq!(service.halton_sequence(0, 3), 0.0);
        assert!((service.halton_sequence(1, 3) - 0.333333).abs() < 0.001);
        assert!((service.halton_sequence(2, 3) - 0.666666).abs() < 0.001);
    }

    #[test]
    fn test_halton_jitter_enabled() {
        let config = TAAConfig {
            use_jitter: true,
            ..Default::default()
        };
        let service = TAAPassService::new(config);

        let (jitter_x, jitter_y) = service.halton_jitter(1);

        // Jitter should be in [-0.5, 0.5] range
        assert!(jitter_x >= -0.5 && jitter_x <= 0.5);
        assert!(jitter_y >= -0.5 && jitter_y <= 0.5);

        // For index 1: Halton(2,1)=0.5, Halton(3,1)=0.333
        // Remapped: (0.5 - 0.5, 0.333 - 0.5) = (0.0, -0.166...)
        assert!((jitter_x - 0.0).abs() < 0.001);
        assert!((jitter_y - (-0.166666)).abs() < 0.001);
    }

    #[test]
    fn test_halton_jitter_disabled() {
        let config = TAAConfig {
            use_jitter: false,
            ..Default::default()
        };
        let service = TAAPassService::new(config);

        let (jitter_x, jitter_y) = service.halton_jitter(100);

        // Jitter disabled → always (0, 0)
        assert_eq!(jitter_x, 0.0);
        assert_eq!(jitter_y, 0.0);
    }

    #[test]
    fn test_frame_index_increments() {
        let config = TAAConfig::default();
        let mut service = TAAPassService::new(config);

        assert_eq!(service.get_frame_index(), 0);

        service.frame_index += 1;
        assert_eq!(service.get_frame_index(), 1);

        service.frame_index += 1;
        assert_eq!(service.get_frame_index(), 2);
    }

    #[test]
    fn test_reset_history() {
        let config = TAAConfig::default();
        let mut service = TAAPassService::new(config);

        service.frame_index = 100;
        service.reset_history();

        assert_eq!(service.frame_index, 0);
    }

    #[test]
    fn test_update_params() {
        let mut service = TAAPassService::new(TAAConfig::default());

        service.update_params(0.85, 2.0, false);

        assert_eq!(service.config.temporal_blend_factor, 0.85);
        assert_eq!(service.config.variance_clip_gamma, 2.0);
        assert!(!service.config.use_jitter);
    }

    #[test]
    fn test_temporal_blend_factor_clamping() {
        let mut service = TAAPassService::new(TAAConfig::default());

        // Blend factor > 1.0 should clamp to 1.0
        service.update_params(1.5, 1.5, true);
        assert_eq!(service.config.temporal_blend_factor, 1.0);

        // Blend factor < 0.0 should clamp to 0.0
        service.update_params(-0.5, 1.5, true);
        assert_eq!(service.config.temporal_blend_factor, 0.0);
    }

    #[test]
    fn test_disabled_taa() {
        let mut service = TAAPassService::new(TAAConfig::default());
        service.set_enabled(false);

        assert!(!service.config.enabled);
    }

    #[test]
    fn test_default_config_values() {
        let config = TAAConfig::default();

        assert_eq!(config.temporal_blend_factor, 0.9);
        assert_eq!(config.variance_clip_gamma, 1.5);
        assert!(config.use_jitter);
        assert!(config.enabled);
    }

    #[test]
    fn test_halton_jitter_uniqueness() {
        let config = TAAConfig::default();
        let service = TAAPassService::new(config);

        // Different frame indices → different jitter values
        let jitter1 = service.halton_jitter(0);
        let jitter2 = service.halton_jitter(1);
        let jitter3 = service.halton_jitter(2);

        assert_ne!(jitter1, jitter2);
        assert_ne!(jitter2, jitter3);
        assert_ne!(jitter1, jitter3);
    }
}
