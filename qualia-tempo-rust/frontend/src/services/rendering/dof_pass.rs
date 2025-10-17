//! # Responsibility
//! Implements Depth of Field post-processing effect.
//!
//! ---
//!
//! Simulates camera focus by blurring foreground/background based on depth.
//! Creates cinematic focus effect that highlights the player and boss during intense moments.
//! Uses Circle of Confusion (CoC) calculation for physically-based depth blur.

use anyhow::Result;
use serde::{Deserialize, Serialize};
use wgpu::*;

/// # Responsibility
/// Configuration for Depth of Field effect parameters.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DoFConfig {
    /// Enable DoF effect
    pub enabled: bool,
    /// Focal distance (units from camera)
    pub focal_distance: f32,
    /// Focal range (depth of sharp focus)
    pub focal_range: f32,
    /// Maximum blur radius (pixels)
    pub max_blur_radius: f32,
    /// Aperture (f-stop) - lower = more blur
    pub aperture: f32,
}

impl Default for DoFConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            focal_distance: 10.0, // Focus at 10 units
            focal_range: 5.0,     // ±5 units sharp
            max_blur_radius: 8.0, // 8px max blur
            aperture: 2.8,        // Wide aperture (shallow DoF)
        }
    }
}

/// # Responsibility
/// GPU shader uniforms for DoF pass.
#[repr(C)]
#[derive(Debug, Clone, Copy, bytemuck::Pod, bytemuck::Zeroable)]
struct DoFUniforms {
    focal_distance: f32,
    focal_range: f32,
    max_blur_radius: f32,
    aperture: f32,
    _padding: [f32; 4], // 16-byte alignment for WGSL
}

/// # Responsibility
/// Renders Depth of Field effect in the post-processing chain.
///
/// ---
///
/// Implements Bokeh-style depth blur using Circle of Confusion (CoC) calculation.
/// Reads from G-Buffer depth texture and applies variable blur based on distance from focal plane.
pub struct DoFPassService {
    config: DoFConfig,
    pipeline: Option<RenderPipeline>,
    bind_group: Option<BindGroup>,
    uniform_buffer: Option<Buffer>,
}

impl DoFPassService {
    /// Creates a new DoF pass service with the given configuration.
    pub fn new(config: DoFConfig) -> Self {
        Self {
            config,
            pipeline: None,
            bind_group: None,
            uniform_buffer: None,
        }
    }

    /// Initializes the DoF render pipeline with wgpu device.
    pub fn initialize(&mut self, device: &Device) -> Result<()> {
        // Create uniform buffer
        let uniforms = DoFUniforms {
            focal_distance: self.config.focal_distance,
            focal_range: self.config.focal_range,
            max_blur_radius: self.config.max_blur_radius,
            aperture: self.config.aperture,
            _padding: [0.0; 4],
        };

        let uniform_buffer = device.create_buffer_init(&util::BufferInitDescriptor {
            label: Some("DoF Uniform Buffer"),
            contents: bytemuck::cast_slice(&[uniforms]),
            usage: BufferUsages::UNIFORM | BufferUsages::COPY_DST,
        });

        self.uniform_buffer = Some(uniform_buffer);

        Ok(())
    }

    /// Renders the DoF effect to the output texture.
    ///
    /// # Arguments
    /// * `device` - wgpu device
    /// * `queue` - wgpu queue
    /// * `encoder` - Command encoder for GPU commands
    /// * `color_texture` - Input color texture (scene render)
    /// * `depth_texture` - Depth buffer from G-Buffer
    /// * `output_texture` - Output texture for blurred result
    pub fn render(
        &self,
        device: &Device,
        queue: &Queue,
        encoder: &mut CommandEncoder,
        color_texture: &TextureView,
        depth_texture: &TextureView,
        output_texture: &TextureView,
    ) -> Result<()> {
        if !self.config.enabled {
            // DoF disabled - just copy input to output
            // TODO: Implement blit/copy pass
            return Ok(());
        }

        // TODO: Implement full DoF shader pass
        // For now, stub implementation
        
        Ok(())
    }

    /// Updates DoF parameters dynamically (e.g., from QualiaState).
    ///
    /// # Example
    /// ```rust
    /// // Increase blur during low precision (unfocused gameplay)
    /// dof_service.update_params(
    ///     10.0,  // focal_distance
    ///     2.0,   // focal_range (tighter = more blur)
    ///     12.0,  // max_blur_radius (increased)
    ///     1.4    // aperture (wider = shallower DoF)
    /// ).await;
    /// ```
    pub fn update_params(
        &mut self,
        focal_distance: f32,
        focal_range: f32,
        max_blur_radius: f32,
        aperture: f32,
    ) {
        self.config.focal_distance = focal_distance;
        self.config.focal_range = focal_range;
        self.config.max_blur_radius = max_blur_radius;
        self.config.aperture = aperture;
    }

    /// Calculates Circle of Confusion (CoC) for a given depth.
    ///
    /// # Returns
    /// Blur radius in pixels (0.0 = sharp, max_blur_radius = fully blurred)
    pub fn calculate_coc(&self, depth: f32) -> f32 {
        // Distance from focal plane
        let distance_from_focus = (depth - self.config.focal_distance).abs();

        // Within focal range → sharp (CoC = 0)
        if distance_from_focus <= self.config.focal_range {
            return 0.0;
        }

        // Outside focal range → calculate blur
        let blur_factor = (distance_from_focus - self.config.focal_range) / self.config.aperture;
        blur_factor.min(self.config.max_blur_radius)
    }

    /// Sets whether DoF is enabled/disabled.
    pub fn set_enabled(&mut self, enabled: bool) {
        self.config.enabled = enabled;
    }

    /// Returns current DoF configuration.
    pub fn get_config(&self) -> &DoFConfig {
        &self.config
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_coc_calculation_sharp_focus() {
        let config = DoFConfig {
            enabled: true,
            focal_distance: 10.0,
            focal_range: 5.0,
            max_blur_radius: 8.0,
            aperture: 2.8,
        };
        let service = DoFPassService::new(config);

        // Depth exactly at focal distance → sharp (CoC = 0)
        assert_eq!(service.calculate_coc(10.0), 0.0);

        // Depth within focal range → sharp
        assert_eq!(service.calculate_coc(12.0), 0.0); // 10 + 2 (within ±5)
        assert_eq!(service.calculate_coc(8.0), 0.0);  // 10 - 2 (within ±5)
    }

    #[test]
    fn test_coc_calculation_out_of_focus() {
        let config = DoFConfig {
            enabled: true,
            focal_distance: 10.0,
            focal_range: 5.0,
            max_blur_radius: 8.0,
            aperture: 2.8,
        };
        let service = DoFPassService::new(config);

        // Depth outside focal range → blurred
        let coc_far = service.calculate_coc(20.0); // 10 units past focus
        assert!(coc_far > 0.0);
        assert!(coc_far <= 8.0); // Should not exceed max

        let coc_near = service.calculate_coc(0.0); // 10 units before focus
        assert!(coc_near > 0.0);
        assert!(coc_near <= 8.0);
    }

    #[test]
    fn test_coc_max_clamp() {
        let config = DoFConfig {
            enabled: true,
            focal_distance: 10.0,
            focal_range: 5.0,
            max_blur_radius: 8.0,
            aperture: 2.8,
        };
        let service = DoFPassService::new(config);

        // Very far depth → should clamp to max_blur_radius
        let coc = service.calculate_coc(1000.0);
        assert_eq!(coc, 8.0);
    }

    #[test]
    fn test_aperture_affects_blur() {
        let mut config = DoFConfig::default();
        config.focal_distance = 10.0;
        config.focal_range = 5.0;
        config.max_blur_radius = 8.0;

        // Wide aperture (f/1.4) → more blur
        config.aperture = 1.4;
        let service_wide = DoFPassService::new(config.clone());
        let coc_wide = service_wide.calculate_coc(20.0);

        // Narrow aperture (f/8.0) → less blur
        config.aperture = 8.0;
        let service_narrow = DoFPassService::new(config);
        let coc_narrow = service_narrow.calculate_coc(20.0);

        // Wide aperture should produce MORE blur
        assert!(coc_wide > coc_narrow);
    }

    #[test]
    fn test_update_params() {
        let mut service = DoFPassService::new(DoFConfig::default());

        service.update_params(15.0, 3.0, 10.0, 1.8);

        assert_eq!(service.config.focal_distance, 15.0);
        assert_eq!(service.config.focal_range, 3.0);
        assert_eq!(service.config.max_blur_radius, 10.0);
        assert_eq!(service.config.aperture, 1.8);
    }

    #[test]
    fn test_disabled_dof() {
        let mut service = DoFPassService::new(DoFConfig::default());
        service.set_enabled(false);

        assert!(!service.config.enabled);
    }

    #[test]
    fn test_default_config_values() {
        let config = DoFConfig::default();

        assert_eq!(config.focal_distance, 10.0);
        assert_eq!(config.focal_range, 5.0);
        assert_eq!(config.max_blur_radius, 8.0);
        assert_eq!(config.aperture, 2.8);
        assert!(config.enabled);
    }
}
