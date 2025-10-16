//! # Responsibility
//! GPU-accelerated particle simulation via compute shaders.
//!
//! ---
//!
//! Implements particle physics (position, velocity, lifetime) on GPU to
//! support massive particle counts (10,000+) at 60 FPS.

use wgpu;
use std::sync::Arc;
use crate::services::core::ILogger;

/// # Responsibility
/// Configuration for particle compute simulation.
#[derive(Debug, Clone)]
pub struct ParticleComputeConfig {
    /// Maximum number of particles (buffer size)
    pub max_particles: u32,
    
    /// Particle simulation timestep (seconds)
    pub timestep: f32,
    
    /// Global gravity force (m/s²)
    pub gravity: (f32, f32, f32),
    
    /// Global damping factor (velocity decay)
    pub damping: f32,
    
    /// Emit particles per second
    pub emission_rate: u32,
    
    /// Enable GPU particle-particle collisions (expensive)
    pub enable_collisions: bool,
}

impl Default for ParticleComputeConfig {
    fn default() -> Self {
        Self {
            max_particles: 10_000,
            timestep: 0.016, // ~60 FPS
            gravity: (0.0, -9.8, 0.0),
            damping: 0.98,
            emission_rate: 100,
            enable_collisions: false,
        }
    }
}

/// # Responsibility
/// GPU-resident particle data (position, velocity, lifetime, color).
///
/// ---
///
/// This struct matches the WGSL buffer layout for GPU storage.
#[repr(C)]
#[derive(Debug, Clone, Copy)]
pub struct ParticleGPU {
    /// Position (x, y, z, _)
    pub position: [f32; 4],
    
    /// Velocity (vx, vy, vz, _)
    pub velocity: [f32; 4],
    
    /// Lifetime (current, max, _, _)
    pub lifetime: [f32; 4],
    
    /// Color (r, g, b, a)
    pub color: [f32; 4],
}

impl Default for ParticleGPU {
    fn default() -> Self {
        Self {
            position: [0.0, 0.0, 0.0, 0.0],
            velocity: [0.0, 0.0, 0.0, 0.0],
            lifetime: [0.0, 5.0, 0.0, 0.0], // current=0, max=5s
            color: [1.0, 1.0, 1.0, 1.0],
        }
    }
}

/// # Responsibility
/// Orchestrates GPU particle simulation via compute shaders.
///
/// ---
///
/// Uses wgpu compute pipelines to update particle state each frame.
/// QualiaState modulates emission rate, color, and gravity.
pub struct ParticleComputeService {
    config: ParticleComputeConfig,
    logger: Arc<dyn ILogger>,
    
    // Compute pipeline
    compute_pipeline: Option<wgpu::ComputePipeline>,
    
    // Particle buffers (double-buffered for read/write in compute shader)
    particle_buffer_a: Option<wgpu::Buffer>,
    particle_buffer_b: Option<wgpu::Buffer>,
    
    // Bind groups for A→B and B→A updates
    bind_group_a_to_b: Option<wgpu::BindGroup>,
    bind_group_b_to_a: Option<wgpu::BindGroup>,
    
    // Current frame parity (false = A→B, true = B→A)
    frame_parity: bool,
    
    // Particle count (active particles)
    active_particles: u32,
}

impl ParticleComputeService {
    /// # Responsibility
    /// Creates a new ParticleComputeService with the given configuration.
    pub fn new(config: ParticleComputeConfig, logger: Arc<dyn ILogger>) -> Self {
        logger.info("Creating ParticleComputeService");
        
        Self {
            config,
            logger,
            compute_pipeline: None,
            particle_buffer_a: None,
            particle_buffer_b: None,
            bind_group_a_to_b: None,
            bind_group_b_to_a: None,
            frame_parity: false,
            active_particles: 0,
        }
    }
    
    /// # Responsibility
    /// Initializes the compute service with wgpu device.
    pub fn initialize(&mut self, device: &wgpu::Device) -> Result<(), String> {
        self.logger.info("Initializing ParticleComputeService");
        
        // Create particle buffers (double-buffered)
        let buffer_size = (self.config.max_particles as usize * std::mem::size_of::<ParticleGPU>()) as u64;
        
        self.particle_buffer_a = Some(device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Particle Buffer A"),
            size: buffer_size,
            usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_DST | wgpu::BufferUsages::COPY_SRC,
            mapped_at_creation: false,
        }));
        
        self.particle_buffer_b = Some(device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Particle Buffer B"),
            size: buffer_size,
            usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_DST | wgpu::BufferUsages::COPY_SRC,
            mapped_at_creation: false,
        }));
        
        // Create compute pipeline
        self.compute_pipeline = Some(self.create_compute_pipeline(device)?);
        
        self.logger.info("ParticleComputeService initialized successfully");
        Ok(())
    }
    
    /// # Responsibility
    /// Creates the particle update compute pipeline.
    fn create_compute_pipeline(&self, device: &wgpu::Device) -> Result<wgpu::ComputePipeline, String> {
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Particle Compute Shader"),
            source: wgpu::ShaderSource::Wgsl(include_str!("shaders/particle_compute.wgsl").into()),
        });
        
        let bind_group_layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("Particle Compute Bind Group Layout"),
            entries: &[
                // Input particle buffer (read-only)
                wgpu::BindGroupLayoutEntry {
                    binding: 0,
                    visibility: wgpu::ShaderStages::COMPUTE,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Storage { read_only: true },
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
                // Output particle buffer (write-only)
                wgpu::BindGroupLayoutEntry {
                    binding: 1,
                    visibility: wgpu::ShaderStages::COMPUTE,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Storage { read_only: false },
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
            ],
        });
        
        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Particle Compute Pipeline Layout"),
            bind_group_layouts: &[&bind_group_layout],
            push_constant_ranges: &[],
        });
        
        let pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("Particle Compute Pipeline"),
            layout: Some(&pipeline_layout),
            module: &shader,
            entry_point: "main",
            compilation_options: wgpu::PipelineCompilationOptions::default(),
            cache: None,
        });
        
        Ok(pipeline)
    }
    
    /// # Responsibility
    /// Updates particle simulation for one frame via compute shader.
    ///
    /// ---
    ///
    /// Dispatches compute work with double-buffering:
    /// - Frame 0: Read A, Write B
    /// - Frame 1: Read B, Write A
    /// - etc.
    pub fn update(
        &mut self,
        encoder: &mut wgpu::CommandEncoder,
        _delta_time: f32,
        _qualia_intensity: f32,
    ) -> Result<(), String> {
        let pipeline = self.compute_pipeline.as_ref().ok_or("ParticleComputeService not initialized")?;
        
        // TODO: Implement compute dispatch
        // 1. Create bind group for current frame parity (A→B or B→A)
        // 2. Begin compute pass
        // 3. Set pipeline
        // 4. Set bind group
        // 5. Dispatch work groups: (max_particles / 64).ceil() workgroups
        // 6. Toggle frame parity
        
        // Placeholder: just log
        self.logger.info(&format!("Particle update dispatched: {} active particles", self.active_particles));
        
        // Toggle parity for next frame
        self.frame_parity = !self.frame_parity;
        
        Ok(())
    }
    
    /// # Responsibility
    /// Emits new particles from emitter position.
    pub fn emit_particles(
        &mut self,
        _queue: &wgpu::Queue,
        _emitter_position: (f32, f32, f32),
        _count: u32,
    ) -> Result<(), String> {
        // TODO: Implement particle emission
        // 1. Generate new particles with random velocities
        // 2. Write to particle buffer at active_particles offset
        // 3. Increment active_particles counter
        // 4. Clamp to max_particles
        
        self.logger.info("Particles emitted (TODO)");
        Ok(())
    }
    
    /// # Responsibility
    /// Returns the current active particle buffer for rendering.
    pub fn get_active_buffer(&self) -> Result<&wgpu::Buffer, String> {
        // Return buffer A or B depending on frame parity
        if self.frame_parity {
            self.particle_buffer_b.as_ref().ok_or_else(|| "Particle buffer B not initialized".to_string())
        } else {
            self.particle_buffer_a.as_ref().ok_or_else(|| "Particle buffer A not initialized".to_string())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::tests::mocks::MockLogger;
    
    #[test]
    fn test_particle_compute_config_defaults() {
        let config = ParticleComputeConfig::default();
        
        assert_eq!(config.max_particles, 10_000);
        assert_eq!(config.timestep, 0.016);
        assert_eq!(config.gravity, (0.0, -9.8, 0.0));
        assert_eq!(config.damping, 0.98);
        assert_eq!(config.emission_rate, 100);
        assert!(!config.enable_collisions);
    }
    
    #[test]
    fn test_particle_compute_service_creation() {
        let config = ParticleComputeConfig::default();
        let logger = Arc::new(MockLogger::new());
        
        let service = ParticleComputeService::new(config, logger.clone());
        
        assert!(service.compute_pipeline.is_none());
        assert_eq!(service.active_particles, 0);
        assert!(!service.frame_parity);
        
        let messages = logger.get_messages();
        assert!(messages.iter().any(|m| m.contains("Creating ParticleComputeService")));
    }
    
    #[test]
    fn test_particle_gpu_default() {
        let particle = ParticleGPU::default();
        
        assert_eq!(particle.position, [0.0, 0.0, 0.0, 0.0]);
        assert_eq!(particle.velocity, [0.0, 0.0, 0.0, 0.0]);
        assert_eq!(particle.lifetime[0], 0.0); // current
        assert_eq!(particle.lifetime[1], 5.0); // max
        assert_eq!(particle.color, [1.0, 1.0, 1.0, 1.0]);
    }
}
