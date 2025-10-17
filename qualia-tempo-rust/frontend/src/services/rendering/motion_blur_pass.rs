//! # Responsibility
//! Implements Motion Blur post-processing effect using velocity buffers.
//!
//! ---
//!
//! Creates cinematic motion blur by sampling along motion vectors stored in G-Buffer.
//! Enhances sense of speed during dashes and boss attacks.
//! Uses per-pixel velocity to determine blur direction and magnitude.

use anyhow::Result;
use serde::{Deserialize, Serialize};
use wgpu::*;

/// # Responsibility
/// Configuration for Motion Blur effect parameters.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MotionBlurConfig {
    /// Enable motion blur effect
    pub enabled: bool,
    /// Number of samples along velocity vector (quality)
    pub sample_count: u32,
    /// Strength multiplier for velocity (0-1)
    pub intensity: f32,
    /// Maximum blur length in pixels
    pub max_blur_length: f32,
}

impl Default for MotionBlurConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            sample_count: 16, // 16 samples = good quality
            intensity: 0.5,   // 50% strength
            max_blur_length: 32.0, // 32px max streak
        }
    }
}

/// # Responsibility
/// GPU shader uniforms for Motion Blur pass.
#[repr(C)]
#[derive(Debug, Clone, Copy, bytemuck::Pod, bytemuck::Zeroable)]
struct MotionBlurUniforms {
    sample_count: u32,
    intensity: f32,
    max_blur_length: f32,
    _padding: f32, // 16-byte alignment
}

/// # Responsibility
/// Renders Motion Blur effect using per-pixel velocity vectors.
///
/// ---
///
/// Reads velocity buffer from G-Buffer (screen-space motion vectors),
/// samples along the velocity vector, and blends samples to create motion streaks.
pub struct MotionBlurPassService {
    config: MotionBlurConfig,
    pipeline: Option<RenderPipeline>,
    bind_group: Option<BindGroup>,
    uniform_buffer: Option<Buffer>,
}

impl MotionBlurPassService {
    /// Creates a new Motion Blur pass service with the given configuration.
    pub fn new(config: MotionBlurConfig) -> Self {
        Self {
            config,
            pipeline: None,
            bind_group: None,
            uniform_buffer: None,
        }
    }

    /// Initializes the Motion Blur render pipeline with wgpu device.
    pub fn initialize(&mut self, device: &Device) -> Result<()> {
        let uniforms = MotionBlurUniforms {
            sample_count: self.config.sample_count,
            intensity: self.config.intensity,
            max_blur_length: self.config.max_blur_length,
            _padding: 0.0,
        };

        let uniform_buffer = device.create_buffer_init(&util::BufferInitDescriptor {
            label: Some("Motion Blur Uniform Buffer"),
            contents: bytemuck::cast_slice(&[uniforms]),
            usage: BufferUsages::UNIFORM | BufferUsages::COPY_DST,
        });

        self.uniform_buffer = Some(uniform_buffer);

        Ok(())
    }

    /// Renders the Motion Blur effect to the output texture.
    ///
    /// # Arguments
    /// * `device` - wgpu device
    /// * `queue` - wgpu queue
    /// * `encoder` - Command encoder for GPU commands
    /// * `color_texture` - Input color texture (scene render)
    /// * `velocity_texture` - Velocity buffer from G-Buffer (RG = screen-space velocity)
    /// * `output_texture` - Output texture for blurred result
    pub fn render(
        &self,
        device: &Device,
        queue: &Queue,
        encoder: &mut CommandEncoder,
        color_texture: &TextureView,
        velocity_texture: &TextureView,
        output_texture: &TextureView,
    ) -> Result<()> {
        if !self.config.enabled {
            // Motion blur disabled - just copy input to output
            // TODO: Implement blit/copy pass
            return Ok(());
        }

        // TODO: Implement full motion blur shader pass
        // Algorithm:
        // 1. Read velocity from velocity buffer (RG channels)
        // 2. For each pixel, sample along velocity vector
        // 3. Blend samples with weighted average
        // 4. Clamp blur length to max_blur_length
        
        Ok(())
    }

    /// Updates motion blur parameters dynamically (e.g., from QualiaState).
    ///
    /// # Example
    /// ```rust
    /// // Increase blur during high aggression (fast movements)
    /// motion_blur_service.update_params(
    ///     16,    // sample_count
    ///     0.8,   // intensity (increased)
    ///     48.0   // max_blur_length (longer streaks)
    /// );
    /// ```
    pub fn update_params(&mut self, sample_count: u32, intensity: f32, max_blur_length: f32) {
        self.config.sample_count = sample_count;
        self.config.intensity = intensity.clamp(0.0, 1.0);
        self.config.max_blur_length = max_blur_length;
    }

    /// Calculates effective blur length for a given velocity.
    ///
    /// # Arguments
    /// * `velocity_x` - Screen-space velocity X (pixels per frame)
    /// * `velocity_y` - Screen-space velocity Y (pixels per frame)
    ///
    /// # Returns
    /// Blur length in pixels (clamped to max_blur_length)
    pub fn calculate_blur_length(&self, velocity_x: f32, velocity_y: f32) -> f32 {
        let velocity_magnitude = (velocity_x * velocity_x + velocity_y * velocity_y).sqrt();
        let blur_length = velocity_magnitude * self.config.intensity;
        blur_length.min(self.config.max_blur_length)
    }

    /// Sets whether motion blur is enabled/disabled.
    pub fn set_enabled(&mut self, enabled: bool) {
        self.config.enabled = enabled;
    }

    /// Returns current motion blur configuration.
    pub fn get_config(&self) -> &MotionBlurConfig {
        &self.config
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_blur_length_calculation() {
        let config = MotionBlurConfig {
            enabled: true,
            sample_count: 16,
            intensity: 0.5,
            max_blur_length: 32.0,
        };
        let service = MotionBlurPassService::new(config);

        // No velocity → no blur
        assert_eq!(service.calculate_blur_length(0.0, 0.0), 0.0);

        // Moderate velocity → moderate blur
        let blur = service.calculate_blur_length(10.0, 0.0);
        assert_eq!(blur, 5.0); // 10 * 0.5 intensity

        // High velocity → clamped to max
        let blur_high = service.calculate_blur_length(100.0, 0.0);
        assert_eq!(blur_high, 32.0); // Clamped to max_blur_length
    }

    #[test]
    fn test_blur_length_vector_magnitude() {
        let config = MotionBlurConfig {
            enabled: true,
            sample_count: 16,
            intensity: 1.0, // Full intensity for easier math
            max_blur_length: 100.0,
        };
        let service = MotionBlurPassService::new(config);

        // Diagonal velocity (3-4-5 triangle)
        let blur = service.calculate_blur_length(3.0, 4.0);
        assert!((blur - 5.0).abs() < 0.01); // sqrt(9 + 16) = 5

        // Another diagonal (5-12-13 triangle)
        let blur = service.calculate_blur_length(5.0, 12.0);
        assert!((blur - 13.0).abs() < 0.01); // sqrt(25 + 144) = 13
    }

    #[test]
    fn test_intensity_affects_blur_length() {
        let mut config = MotionBlurConfig::default();
        config.max_blur_length = 100.0; // High limit to avoid clamping

        // Low intensity → less blur
        config.intensity = 0.1;
        let service_low = MotionBlurPassService::new(config.clone());
        let blur_low = service_low.calculate_blur_length(50.0, 0.0);

        // High intensity → more blur
        config.intensity = 0.9;
        let service_high = MotionBlurPassService::new(config);
        let blur_high = service_high.calculate_blur_length(50.0, 0.0);

        assert!(blur_high > blur_low);
        assert_eq!(blur_low, 5.0);  // 50 * 0.1
        assert_eq!(blur_high, 45.0); // 50 * 0.9
    }

    #[test]
    fn test_max_blur_length_clamp() {
        let config = MotionBlurConfig {
            enabled: true,
            sample_count: 16,
            intensity: 1.0,
            max_blur_length: 20.0,
        };
        let service = MotionBlurPassService::new(config);

        // Velocity would produce 50px blur, but clamped to 20px
        let blur = service.calculate_blur_length(50.0, 0.0);
        assert_eq!(blur, 20.0);
    }

    #[test]
    fn test_update_params() {
        let mut service = MotionBlurPassService::new(MotionBlurConfig::default());

        service.update_params(32, 0.75, 64.0);

        assert_eq!(service.config.sample_count, 32);
        assert_eq!(service.config.intensity, 0.75);
        assert_eq!(service.config.max_blur_length, 64.0);
    }

    #[test]
    fn test_intensity_clamping() {
        let mut service = MotionBlurPassService::new(MotionBlurConfig::default());

        // Intensity > 1.0 should clamp to 1.0
        service.update_params(16, 1.5, 32.0);
        assert_eq!(service.config.intensity, 1.0);

        // Intensity < 0.0 should clamp to 0.0
        service.update_params(16, -0.5, 32.0);
        assert_eq!(service.config.intensity, 0.0);
    }

    #[test]
    fn test_disabled_motion_blur() {
        let mut service = MotionBlurPassService::new(MotionBlurConfig::default());
        service.set_enabled(false);

        assert!(!service.config.enabled);
    }

    #[test]
    fn test_default_config_values() {
        let config = MotionBlurConfig::default();

        assert_eq!(config.sample_count, 16);
        assert_eq!(config.intensity, 0.5);
        assert_eq!(config.max_blur_length, 32.0);
        assert!(config.enabled);
    }

    #[test]
    fn test_zero_intensity_produces_no_blur() {
        let config = MotionBlurConfig {
            enabled: true,
            sample_count: 16,
            intensity: 0.0,
            max_blur_length: 32.0,
        };
        let service = MotionBlurPassService::new(config);

        // Even with high velocity, 0 intensity = 0 blur
        let blur = service.calculate_blur_length(100.0, 100.0);
        assert_eq!(blur, 0.0);
    }
}
