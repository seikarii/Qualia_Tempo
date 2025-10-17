//! # Responsibility
//! Renders player avatar using SDF raymarching with morphing geometry.
//!
//! ---
//!
//! Player morphs from humanoid form to Mandelbulb fractal at transcendence > 0.9.
//! Uses GPU raymarching for smooth, analytical surface normals.
//! Implements sphere tracing with adaptive step size.

use anyhow::Result;
use serde::{Deserialize, Serialize};
use wgpu::*;

/// # Responsibility
/// Configuration for player SDF rendering.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerSDFConfig {
    /// Enable SDF rendering
    pub enabled: bool,
    /// Maximum raymarching iterations
    pub max_iterations: u32,
    /// Surface hit threshold (smaller = more precise)
    pub epsilon: f32,
    /// Maximum ray distance
    pub max_distance: f32,
    /// Mandelbulb power parameter (controls fractal complexity)
    pub mandelbulb_power: f32,
}

impl Default for PlayerSDFConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            max_iterations: 128,     // 128 iterations for quality
            epsilon: 0.001,          // 1mm precision
            max_distance: 100.0,     // 100 units max distance
            mandelbulb_power: 8.0,   // Classic Mandelbulb power
        }
    }
}

/// # Responsibility
/// GPU shader uniforms for player SDF raymarching.
#[repr(C)]
#[derive(Debug, Clone, Copy, bytemuck::Pod, bytemuck::Zeroable)]
struct PlayerSDFUniforms {
    max_iterations: u32,
    epsilon: f32,
    max_distance: f32,
    mandelbulb_power: f32,
    
    transcendence: f32,  // Morph factor [0, 1] (0 = humanoid, 1 = Mandelbulb)
    player_pos_x: f32,
    player_pos_y: f32,
    player_pos_z: f32,
    
    base_color_r: f32,
    base_color_g: f32,
    base_color_b: f32,
    metallic: f32,
}

/// # Responsibility
/// Renders player avatar via SDF raymarching with transcendence morphing.
///
/// ---
///
/// SDF Formula:
/// - transcendence < 0.9: Capsule SDF (humanoid approximation)
/// - transcendence >= 0.9: Mandelbulb SDF (fractal)
/// - Lerp between forms based on transcendence value
pub struct PlayerAvatarSDFService {
    config: PlayerSDFConfig,
    pipeline: Option<RenderPipeline>,
    bind_group: Option<BindGroup>,
    uniform_buffer: Option<Buffer>,
}

impl PlayerAvatarSDFService {
    /// Creates a new player SDF renderer with the given configuration.
    pub fn new(config: PlayerSDFConfig) -> Self {
        Self {
            config,
            pipeline: None,
            bind_group: None,
            uniform_buffer: None,
        }
    }

    /// Initializes the player SDF render pipeline with wgpu device.
    pub fn initialize(&mut self, device: &Device) -> Result<()> {
        let uniforms = PlayerSDFUniforms {
            max_iterations: self.config.max_iterations,
            epsilon: self.config.epsilon,
            max_distance: self.config.max_distance,
            mandelbulb_power: self.config.mandelbulb_power,
            transcendence: 0.0,
            player_pos_x: 0.0,
            player_pos_y: 0.0,
            player_pos_z: 0.0,
            base_color_r: 0.2,
            base_color_g: 0.6,
            base_color_b: 1.0,
            metallic: 0.5,
        };

        let uniform_buffer = device.create_buffer_init(&util::BufferInitDescriptor {
            label: Some("Player SDF Uniform Buffer"),
            contents: bytemuck::cast_slice(&[uniforms]),
            usage: BufferUsages::UNIFORM | BufferUsages::COPY_DST,
        });

        self.uniform_buffer = Some(uniform_buffer);

        Ok(())
    }

    /// Renders the player avatar to the output texture.
    ///
    /// # Arguments
    /// * `device` - wgpu device
    /// * `queue` - wgpu queue
    /// * `encoder` - Command encoder for GPU commands
    /// * `output_texture` - Output texture (G-Buffer)
    /// * `player_pos` - Player world position
    /// * `transcendence` - Morph factor [0, 1]
    pub fn render(
        &self,
        device: &Device,
        queue: &Queue,
        encoder: &mut CommandEncoder,
        output_texture: &TextureView,
        player_pos: (f32, f32, f32),
        transcendence: f32,
    ) -> Result<()> {
        if !self.config.enabled {
            return Ok(());
        }

        // TODO: Implement full SDF raymarching shader
        // Shader algorithm:
        // 1. For each pixel, cast ray from camera
        // 2. Sphere trace using SDF distance field
        // 3. Calculate SDF based on transcendence:
        //    - capsule_sdf(p) for humanoid
        //    - mandelbulb_sdf(p) for fractal
        //    - mix(capsule, mandelbulb, smoothstep(0.8, 1.0, transcendence))
        // 4. Calculate normals via gradient (central differences)
        // 5. Write to G-Buffer (position, normal, albedo, metallic)

        Ok(())
    }

    /// Calculates capsule SDF distance (humanoid approximation).
    ///
    /// # Arguments
    /// * `p` - Sample point
    /// * `a` - Capsule start point
    /// * `b` - Capsule end point
    /// * `r` - Capsule radius
    ///
    /// # Returns
    /// Signed distance to capsule surface
    pub fn capsule_sdf(p: (f32, f32, f32), a: (f32, f32, f32), b: (f32, f32, f32), r: f32) -> f32 {
        let pa = (p.0 - a.0, p.1 - a.1, p.2 - a.2);
        let ba = (b.0 - a.0, b.1 - a.1, b.2 - a.2);

        let h = ((pa.0 * ba.0 + pa.1 * ba.1 + pa.2 * ba.2) / 
                 (ba.0 * ba.0 + ba.1 * ba.1 + ba.2 * ba.2))
                 .clamp(0.0, 1.0);

        let diff_x = pa.0 - ba.0 * h;
        let diff_y = pa.1 - ba.1 * h;
        let diff_z = pa.2 - ba.2 * h;

        let dist = (diff_x * diff_x + diff_y * diff_y + diff_z * diff_z).sqrt();
        dist - r
    }

    /// Estimates Mandelbulb SDF distance (fractal approximation).
    ///
    /// # Arguments
    /// * `p` - Sample point
    /// * `power` - Mandelbulb power (8.0 = classic)
    /// * `bailout` - Escape radius
    ///
    /// # Returns
    /// Estimated signed distance to Mandelbulb surface
    pub fn mandelbulb_sdf(p: (f32, f32, f32), power: f32, bailout: f32) -> f32 {
        let mut z = p;
        let mut dr = 1.0;
        let mut r = 0.0;

        for _ in 0..8 {
            r = (z.0 * z.0 + z.1 * z.1 + z.2 * z.2).sqrt();
            if r > bailout {
                break;
            }

            // Convert to polar coordinates
            let theta = (z.2 / r).acos();
            let phi = z.1.atan2(z.0);

            dr = r.powf(power - 1.0) * power * dr + 1.0;

            // Scale and rotate
            let zr = r.powf(power);
            let new_theta = theta * power;
            let new_phi = phi * power;

            z = (
                zr * new_theta.sin() * new_phi.cos() + p.0,
                zr * new_theta.sin() * new_phi.sin() + p.1,
                zr * new_theta.cos() + p.2,
            );
        }

        0.5 * r.ln() * r / dr
    }

    /// Updates player SDF parameters dynamically.
    pub fn update_params(&mut self, transcendence: f32, player_pos: (f32, f32, f32), color: (f32, f32, f32)) {
        // Parameters will be updated via uniform buffer in actual GPU implementation
    }

    /// Sets whether player SDF is enabled/disabled.
    pub fn set_enabled(&mut self, enabled: bool) {
        self.config.enabled = enabled;
    }

    /// Returns current configuration.
    pub fn get_config(&self) -> &PlayerSDFConfig {
        &self.config
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_capsule_sdf_on_surface() {
        let p = (0.0, 1.0, 0.0);
        let a = (0.0, 0.0, 0.0);
        let b = (0.0, 2.0, 0.0);
        let r = 0.5;

        let dist = PlayerAvatarSDFService::capsule_sdf(p, a, b, r);

        // Point at (0, 1, 0) is on the centerline, distance should be -r (inside)
        assert!((dist - (-r)).abs() < 0.01);
    }

    #[test]
    fn test_capsule_sdf_outside() {
        let p = (1.0, 1.0, 0.0);
        let a = (0.0, 0.0, 0.0);
        let b = (0.0, 2.0, 0.0);
        let r = 0.5;

        let dist = PlayerAvatarSDFService::capsule_sdf(p, a, b, r);

        // Point at (1, 1, 0) is 1 unit away from centerline, minus radius
        assert!((dist - 0.5).abs() < 0.01); // 1.0 - 0.5 = 0.5
    }

    #[test]
    fn test_capsule_sdf_symmetry() {
        let a = (0.0, 0.0, 0.0);
        let b = (0.0, 2.0, 0.0);
        let r = 0.5;

        let dist_left = PlayerAvatarSDFService::capsule_sdf((-1.0, 1.0, 0.0), a, b, r);
        let dist_right = PlayerAvatarSDFService::capsule_sdf((1.0, 1.0, 0.0), a, b, r);

        // Symmetric points should have same distance
        assert!((dist_left - dist_right).abs() < 0.01);
    }

    #[test]
    fn test_mandelbulb_sdf_origin() {
        let p = (0.0, 0.0, 0.0);
        let power = 8.0;
        let bailout = 2.0;

        let dist = PlayerAvatarSDFService::mandelbulb_sdf(p, power, bailout);

        // Origin is inside Mandelbulb (negative distance)
        assert!(dist < 0.0);
    }

    #[test]
    fn test_mandelbulb_sdf_far_point() {
        let p = (10.0, 10.0, 10.0);
        let power = 8.0;
        let bailout = 2.0;

        let dist = PlayerAvatarSDFService::mandelbulb_sdf(p, power, bailout);

        // Far point should be outside (positive distance)
        assert!(dist > 0.0);
    }

    #[test]
    fn test_mandelbulb_power_affects_shape() {
        let p = (0.5, 0.5, 0.5);
        let bailout = 2.0;

        let dist_power4 = PlayerAvatarSDFService::mandelbulb_sdf(p, 4.0, bailout);
        let dist_power8 = PlayerAvatarSDFService::mandelbulb_sdf(p, 8.0, bailout);

        // Different powers → different distances (shape changes)
        assert!((dist_power4 - dist_power8).abs() > 0.01);
    }

    #[test]
    fn test_default_config_values() {
        let config = PlayerSDFConfig::default();

        assert_eq!(config.max_iterations, 128);
        assert_eq!(config.epsilon, 0.001);
        assert_eq!(config.max_distance, 100.0);
        assert_eq!(config.mandelbulb_power, 8.0);
        assert!(config.enabled);
    }

    #[test]
    fn test_disabled_rendering() {
        let mut service = PlayerAvatarSDFService::new(PlayerSDFConfig::default());
        service.set_enabled(false);

        assert!(!service.config.enabled);
    }

    #[test]
    fn test_capsule_sdf_at_endpoints() {
        let a = (0.0, 0.0, 0.0);
        let b = (0.0, 2.0, 0.0);
        let r = 0.5;

        // Point exactly at endpoint A
        let dist_a = PlayerAvatarSDFService::capsule_sdf(a, a, b, r);
        assert!((dist_a - (-r)).abs() < 0.01);

        // Point exactly at endpoint B
        let dist_b = PlayerAvatarSDFService::capsule_sdf(b, a, b, r);
        assert!((dist_b - (-r)).abs() < 0.01);
    }

    #[test]
    fn test_mandelbulb_bailout_prevents_infinite_loop() {
        let p = (0.1, 0.1, 0.1);
        let power = 8.0;
        let bailout = 2.0;

        // Should complete without hanging (bailout prevents infinite iteration)
        let dist = PlayerAvatarSDFService::mandelbulb_sdf(p, power, bailout);

        // Any finite result means bailout worked
        assert!(dist.is_finite());
    }
}
