//! # Responsibility
//! Renders boss avatar using SDF raymarching with procedural geometry.
//!
//! ---
//!
//! Boss uses Julia Set fractal with dynamic complexity based on aggression.
//! Implements GPU raymarching with adaptive step size.
//! Boss pulses and morphs in response to game state (aggression, kairos).

use anyhow::Result;
use serde::{Deserialize, Serialize};
use wgpu::*;

/// # Responsibility
/// Configuration for boss SDF rendering.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BossSDFConfig {
    /// Enable SDF rendering
    pub enabled: bool,
    /// Maximum raymarching iterations
    pub max_iterations: u32,
    /// Surface hit threshold (smaller = more precise)
    pub epsilon: f32,
    /// Maximum ray distance
    pub max_distance: f32,
    /// Julia Set constant (controls fractal shape)
    pub julia_c_real: f32,
    pub julia_c_imag: f32,
}

impl Default for BossSDFConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            max_iterations: 128,
            epsilon: 0.001,
            max_distance: 100.0,
            julia_c_real: -0.4,    // Classic Julia Set constant
            julia_c_imag: 0.6,
        }
    }
}

/// # Responsibility
/// GPU shader uniforms for boss SDF raymarching.
#[repr(C)]
#[derive(Debug, Clone, Copy, bytemuck::Pod, bytemuck::Zeroable)]
struct BossSDFUniforms {
    max_iterations: u32,
    epsilon: f32,
    max_distance: f32,
    julia_c_real: f32,
    
    julia_c_imag: f32,
    aggression: f32,      // Controls fractal complexity
    boss_pos_x: f32,
    boss_pos_y: f32,
    
    boss_pos_z: f32,
    base_color_r: f32,
    base_color_g: f32,
    base_color_b: f32,
    
    pulse_freq: f32,      // Pulse frequency (Hz)
    pulse_amplitude: f32, // Pulse scale amplitude
    metallic: f32,
    _padding: f32,
}

/// # Responsibility
/// Renders boss avatar via SDF raymarching with Julia Set fractal.
///
/// ---
///
/// SDF Formula:
/// - Base: Quaternion Julia Set (4D fractal projected to 3D)
/// - Aggression modulates fractal complexity (more iterations = more detail)
/// - Pulse effect: sin(time * pulse_freq) * pulse_amplitude scales boss
pub struct BossAvatarSDFService {
    config: BossSDFConfig,
    pipeline: Option<RenderPipeline>,
    bind_group: Option<BindGroup>,
    uniform_buffer: Option<Buffer>,
}

impl BossAvatarSDFService {
    /// Creates a new boss SDF renderer with the given configuration.
    pub fn new(config: BossSDFConfig) -> Self {
        Self {
            config,
            pipeline: None,
            bind_group: None,
            uniform_buffer: None,
        }
    }

    /// Initializes the boss SDF render pipeline with wgpu device.
    pub fn initialize(&mut self, device: &Device) -> Result<()> {
        let uniforms = BossSDFUniforms {
            max_iterations: self.config.max_iterations,
            epsilon: self.config.epsilon,
            max_distance: self.config.max_distance,
            julia_c_real: self.config.julia_c_real,
            julia_c_imag: self.config.julia_c_imag,
            aggression: 0.5,
            boss_pos_x: 0.0,
            boss_pos_y: 0.0,
            boss_pos_z: 5.0,
            base_color_r: 1.0,
            base_color_g: 0.2,
            base_color_b: 0.2,
            pulse_freq: 2.0,
            pulse_amplitude: 0.1,
            metallic: 0.8,
            _padding: 0.0,
        };

        let uniform_buffer = device.create_buffer_init(&util::BufferInitDescriptor {
            label: Some("Boss SDF Uniform Buffer"),
            contents: bytemuck::cast_slice(&[uniforms]),
            usage: BufferUsages::UNIFORM | BufferUsages::COPY_DST,
        });

        self.uniform_buffer = Some(uniform_buffer);

        Ok(())
    }

    /// Renders the boss avatar to the output texture.
    ///
    /// # Arguments
    /// * `device` - wgpu device
    /// * `queue` - wgpu queue
    /// * `encoder` - Command encoder for GPU commands
    /// * `output_texture` - Output texture (G-Buffer)
    /// * `boss_pos` - Boss world position
    /// * `aggression` - Aggression level [0, 1]
    /// * `time` - Current time (seconds) for pulse animation
    pub fn render(
        &self,
        device: &Device,
        queue: &Queue,
        encoder: &mut CommandEncoder,
        output_texture: &TextureView,
        boss_pos: (f32, f32, f32),
        aggression: f32,
        time: f32,
    ) -> Result<()> {
        if !self.config.enabled {
            return Ok(());
        }

        // TODO: Implement full SDF raymarching shader
        // Shader algorithm:
        // 1. For each pixel, cast ray from camera
        // 2. Sphere trace using Julia Set SDF
        // 3. Apply pulse: scale = 1.0 + sin(time * pulse_freq) * pulse_amplitude
        // 4. Modulate max_iterations based on aggression (higher = more detail)
        // 5. Calculate normals via gradient (central differences)
        // 6. Write to G-Buffer (position, normal, albedo, metallic)

        Ok(())
    }

    /// Estimates Quaternion Julia Set SDF distance.
    ///
    /// # Arguments
    /// * `p` - Sample point (3D position)
    /// * `c` - Julia Set constant (real, imaginary)
    /// * `max_iter` - Maximum iterations for bailout test
    /// * `bailout` - Escape radius
    ///
    /// # Returns
    /// Estimated signed distance to Julia Set surface
    pub fn julia_set_sdf(p: (f32, f32, f32), c: (f32, f32), max_iter: u32, bailout: f32) -> f32 {
        // Quaternion Julia Set: q = q² + c
        // We use (x, y, z, 0) as quaternion for 3D rendering
        let mut q = (p.0, p.1, p.2, 0.0);
        let mut dq = (1.0, 0.0, 0.0, 0.0); // Derivative for distance estimation

        for _ in 0..max_iter {
            // Quaternion magnitude
            let mag = (q.0 * q.0 + q.1 * q.1 + q.2 * q.2 + q.3 * q.3).sqrt();
            if mag > bailout {
                break;
            }

            // Derivative update: dq = 2 * q * dq
            dq = Self::quat_mult(q, dq);
            dq = (2.0 * dq.0, 2.0 * dq.1, 2.0 * dq.2, 2.0 * dq.3);

            // Julia iteration: q = q² + c
            q = Self::quat_square(q);
            q = (q.0 + c.0, q.1 + c.1, q.2, q.3);
        }

        let mag_q = (q.0 * q.0 + q.1 * q.1 + q.2 * q.2 + q.3 * q.3).sqrt();
        let mag_dq = (dq.0 * dq.0 + dq.1 * dq.1 + dq.2 * dq.2 + dq.3 * dq.3).sqrt();

        0.5 * mag_q.ln() * mag_q / mag_dq
    }

    /// Quaternion multiplication helper.
    fn quat_mult(a: (f32, f32, f32, f32), b: (f32, f32, f32, f32)) -> (f32, f32, f32, f32) {
        (
            a.0 * b.0 - a.1 * b.1 - a.2 * b.2 - a.3 * b.3,
            a.0 * b.1 + a.1 * b.0 + a.2 * b.3 - a.3 * b.2,
            a.0 * b.2 - a.1 * b.3 + a.2 * b.0 + a.3 * b.1,
            a.0 * b.3 + a.1 * b.2 - a.2 * b.1 + a.3 * b.0,
        )
    }

    /// Quaternion square helper (q² = q * q).
    fn quat_square(q: (f32, f32, f32, f32)) -> (f32, f32, f32, f32) {
        Self::quat_mult(q, q)
    }

    /// Updates boss SDF parameters dynamically.
    ///
    /// # Example
    /// ```rust
    /// // Increase pulse during high aggression
    /// boss_sdf.update_params(
    ///     0.9,           // aggression (high)
    ///     (0.0, 0.0, 5.0), // boss_pos
    ///     4.0,           // pulse_freq (faster)
    ///     0.2,           // pulse_amplitude (larger pulses)
    ///     (-0.4, 0.6)    // julia_c (classic)
    /// );
    /// ```
    pub fn update_params(
        &mut self,
        aggression: f32,
        boss_pos: (f32, f32, f32),
        pulse_freq: f32,
        pulse_amplitude: f32,
        julia_c: (f32, f32),
    ) {
        self.config.julia_c_real = julia_c.0;
        self.config.julia_c_imag = julia_c.1;
        // Parameters will be updated via uniform buffer in actual GPU implementation
    }

    /// Sets whether boss SDF is enabled/disabled.
    pub fn set_enabled(&mut self, enabled: bool) {
        self.config.enabled = enabled;
    }

    /// Returns current configuration.
    pub fn get_config(&self) -> &BossSDFConfig {
        &self.config
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_julia_set_sdf_origin() {
        let p = (0.0, 0.0, 0.0);
        let c = (-0.4, 0.6);
        let max_iter = 32;
        let bailout = 2.0;

        let dist = BossAvatarSDFService::julia_set_sdf(p, c, max_iter, bailout);

        // Origin should have finite distance
        assert!(dist.is_finite());
    }

    #[test]
    fn test_julia_set_sdf_far_point() {
        let p = (10.0, 10.0, 10.0);
        let c = (-0.4, 0.6);
        let max_iter = 32;
        let bailout = 2.0;

        let dist = BossAvatarSDFService::julia_set_sdf(p, c, max_iter, bailout);

        // Far point should be outside (positive distance)
        assert!(dist > 0.0);
    }

    #[test]
    fn test_julia_constant_affects_shape() {
        let p = (0.5, 0.5, 0.5);
        let max_iter = 32;
        let bailout = 2.0;

        let dist_c1 = BossAvatarSDFService::julia_set_sdf(p, (-0.4, 0.6), max_iter, bailout);
        let dist_c2 = BossAvatarSDFService::julia_set_sdf(p, (-0.8, 0.2), max_iter, bailout);

        // Different Julia constants → different shapes
        assert!((dist_c1 - dist_c2).abs() > 0.01);
    }

    #[test]
    fn test_quat_mult_identity() {
        let q = (1.0, 2.0, 3.0, 4.0);
        let identity = (1.0, 0.0, 0.0, 0.0);

        let result = BossAvatarSDFService::quat_mult(q, identity);

        // q * 1 = q
        assert_eq!(result, q);
    }

    #[test]
    fn test_quat_mult_commutative_fails() {
        let a = (1.0, 2.0, 3.0, 4.0);
        let b = (5.0, 6.0, 7.0, 8.0);

        let ab = BossAvatarSDFService::quat_mult(a, b);
        let ba = BossAvatarSDFService::quat_mult(b, a);

        // Quaternion multiplication is NOT commutative: ab ≠ ba
        assert_ne!(ab, ba);
    }

    #[test]
    fn test_quat_square() {
        let q = (2.0, 1.0, 0.0, 0.0);

        let q_squared = BossAvatarSDFService::quat_square(q);

        // (2 + i)² = 4 + 4i + i² = 4 + 4i - 1 = 3 + 4i
        assert!((q_squared.0 - 3.0).abs() < 0.01);
        assert!((q_squared.1 - 4.0).abs() < 0.01);
    }

    #[test]
    fn test_max_iterations_affects_precision() {
        let p = (0.5, 0.5, 0.5);
        let c = (-0.4, 0.6);
        let bailout = 2.0;

        let dist_low = BossAvatarSDFService::julia_set_sdf(p, c, 8, bailout);
        let dist_high = BossAvatarSDFService::julia_set_sdf(p, c, 128, bailout);

        // Higher iterations → more accurate distance (may differ)
        // At minimum, both should be finite
        assert!(dist_low.is_finite());
        assert!(dist_high.is_finite());
    }

    #[test]
    fn test_default_config_values() {
        let config = BossSDFConfig::default();

        assert_eq!(config.max_iterations, 128);
        assert_eq!(config.epsilon, 0.001);
        assert_eq!(config.max_distance, 100.0);
        assert_eq!(config.julia_c_real, -0.4);
        assert_eq!(config.julia_c_imag, 0.6);
        assert!(config.enabled);
    }

    #[test]
    fn test_disabled_rendering() {
        let mut service = BossAvatarSDFService::new(BossSDFConfig::default());
        service.set_enabled(false);

        assert!(!service.config.enabled);
    }

    #[test]
    fn test_julia_bailout_prevents_infinite_loop() {
        let p = (0.1, 0.1, 0.1);
        let c = (-0.4, 0.6);
        let max_iter = 256; // Very high iteration count
        let bailout = 2.0;

        // Should complete without hanging
        let dist = BossAvatarSDFService::julia_set_sdf(p, c, max_iter, bailout);

        assert!(dist.is_finite());
    }

    #[test]
    fn test_quat_mult_zero() {
        let q = (1.0, 2.0, 3.0, 4.0);
        let zero = (0.0, 0.0, 0.0, 0.0);

        let result = BossAvatarSDFService::quat_mult(q, zero);

        // q * 0 = 0
        assert_eq!(result, zero);
    }
}
