//! # Responsibility
//! GPU-accelerated reaction-diffusion simulation for organic visual patterns.
//!
//! ---
//!
//! Implements Gray-Scott model on GPU to generate complex, evolving patterns
//! that respond to QualiaState (intensity, chaos).

use wgpu;
use std::sync::Arc;
use crate::services::core::ILogger;

/// # Responsibility
/// Configuration for reaction-diffusion simulation.
#[derive(Debug, Clone)]
pub struct ReactionDiffusionConfig {
    /// Texture resolution (width, height)
    pub resolution: (u32, u32),
    
    /// Diffusion rate for chemical A
    pub diffusion_a: f32,
    
    /// Diffusion rate for chemical B
    pub diffusion_b: f32,
    
    /// Feed rate (adds A, removes B)
    pub feed_rate: f32,
    
    /// Kill rate (removes B)
    pub kill_rate: f32,
    
    /// Simulation timestep
    pub timestep: f32,
    
    /// Color mapping (grayscale to RGBA)
    pub color_mapping: ColorMapping,
}

/// # Responsibility
/// Color mapping strategy for reaction-diffusion visualization.
#[derive(Debug, Clone, Copy)]
pub enum ColorMapping {
    /// Grayscale (concentration of chemical B)
    Grayscale,
    
    /// Heatmap (blue → cyan → green → yellow → red)
    Heatmap,
    
    /// Custom gradient (defined by QualiaState)
    QualiaGradient,
}

impl Default for ReactionDiffusionConfig {
    fn default() -> Self {
        Self {
            resolution: (512, 512),
            diffusion_a: 1.0,
            diffusion_b: 0.5,
            feed_rate: 0.055,  // Classic "coral" pattern
            kill_rate: 0.062,
            timestep: 1.0,
            color_mapping: ColorMapping::Heatmap,
        }
    }
}

/// # Responsibility
/// Orchestrates GPU reaction-diffusion simulation via compute shaders.
///
/// ---
///
/// Uses wgpu compute pipelines to evolve chemical concentrations.
/// QualiaState modulates feed/kill rates for dynamic visual response.
pub struct ReactionDiffusionComputeService {
    config: ReactionDiffusionConfig,
    logger: Arc<dyn ILogger>,
    
    // Compute pipeline
    compute_pipeline: Option<wgpu::ComputePipeline>,
    
    // Chemical concentration textures (double-buffered: A, B)
    texture_a: Option<wgpu::Texture>,
    texture_b: Option<wgpu::Texture>,
    
    // Texture views for binding
    texture_view_a: Option<wgpu::TextureView>,
    texture_view_b: Option<wgpu::TextureView>,
    
    // Bind groups for A→B and B→A updates
    bind_group_a_to_b: Option<wgpu::BindGroup>,
    bind_group_b_to_a: Option<wgpu::BindGroup>,
    
    // Current frame parity (false = A→B, true = B→A)
    frame_parity: bool,
}

impl ReactionDiffusionComputeService {
    /// # Responsibility
    /// Creates a new ReactionDiffusionComputeService with the given configuration.
    pub fn new(config: ReactionDiffusionConfig, logger: Arc<dyn ILogger>) -> Self {
        logger.info("Creating ReactionDiffusionComputeService");
        
        Self {
            config,
            logger,
            compute_pipeline: None,
            texture_a: None,
            texture_b: None,
            texture_view_a: None,
            texture_view_b: None,
            bind_group_a_to_b: None,
            bind_group_b_to_a: None,
            frame_parity: false,
        }
    }
    
    /// # Responsibility
    /// Initializes the compute service with wgpu device.
    pub fn initialize(&mut self, device: &wgpu::Device) -> Result<(), String> {
        self.logger.info("Initializing ReactionDiffusionComputeService");
        
        let (width, height) = self.config.resolution;
        
        // Create chemical concentration textures (Rg32Float: R=chemical A, G=chemical B)
        let texture_desc = wgpu::TextureDescriptor {
            label: None,
            size: wgpu::Extent3d {
                width,
                height,
                depth_or_array_layers: 1,
            },
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: wgpu::TextureFormat::Rg32Float, // 2-channel float (A, B)
            usage: wgpu::TextureUsages::STORAGE_BINDING | wgpu::TextureUsages::TEXTURE_BINDING,
            view_formats: &[],
        };
        
        let texture_a = device.create_texture(&wgpu::TextureDescriptor {
            label: Some("Reaction-Diffusion Texture A"),
            ..texture_desc
        });
        
        let texture_b = device.create_texture(&wgpu::TextureDescriptor {
            label: Some("Reaction-Diffusion Texture B"),
            ..texture_desc
        });
        
        self.texture_view_a = Some(texture_a.create_view(&wgpu::TextureViewDescriptor::default()));
        self.texture_view_b = Some(texture_b.create_view(&wgpu::TextureViewDescriptor::default()));
        
        self.texture_a = Some(texture_a);
        self.texture_b = Some(texture_b);
        
        // Create compute pipeline
        self.compute_pipeline = Some(self.create_compute_pipeline(device)?);
        
        self.logger.info("ReactionDiffusionComputeService initialized successfully");
        Ok(())
    }
    
    /// # Responsibility
    /// Creates the reaction-diffusion compute pipeline.
    fn create_compute_pipeline(&self, device: &wgpu::Device) -> Result<wgpu::ComputePipeline, String> {
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Reaction-Diffusion Compute Shader"),
            source: wgpu::ShaderSource::Wgsl(include_str!("shaders/reaction_diffusion_compute.wgsl").into()),
        });
        
        let bind_group_layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("Reaction-Diffusion Bind Group Layout"),
            entries: &[
                // Input texture (read-only)
                wgpu::BindGroupLayoutEntry {
                    binding: 0,
                    visibility: wgpu::ShaderStages::COMPUTE,
                    ty: wgpu::BindingType::StorageTexture {
                        access: wgpu::StorageTextureAccess::ReadOnly,
                        format: wgpu::TextureFormat::Rg32Float,
                        view_dimension: wgpu::TextureViewDimension::D2,
                    },
                    count: None,
                },
                // Output texture (write-only)
                wgpu::BindGroupLayoutEntry {
                    binding: 1,
                    visibility: wgpu::ShaderStages::COMPUTE,
                    ty: wgpu::BindingType::StorageTexture {
                        access: wgpu::StorageTextureAccess::WriteOnly,
                        format: wgpu::TextureFormat::Rg32Float,
                        view_dimension: wgpu::TextureViewDimension::D2,
                    },
                    count: None,
                },
            ],
        });
        
        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Reaction-Diffusion Pipeline Layout"),
            bind_group_layouts: &[&bind_group_layout],
            push_constant_ranges: &[],
        });
        
        let pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("Reaction-Diffusion Compute Pipeline"),
            layout: Some(&pipeline_layout),
            module: &shader,
            entry_point: "main",
            compilation_options: wgpu::PipelineCompilationOptions::default(),
            cache: None,
        });
        
        Ok(pipeline)
    }
    
    /// # Responsibility
    /// Updates reaction-diffusion simulation for one step via compute shader.
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
        _qualia_chaos: f32,
        _qualia_intensity: f32,
    ) -> Result<(), String> {
        let pipeline = self.compute_pipeline.as_ref().ok_or("ReactionDiffusionComputeService not initialized")?;
        
        // TODO: Implement compute dispatch
        // 1. Create bind group for current frame parity (A→B or B→A)
        // 2. Update uniform buffer with feed/kill rates (modulated by qualia_chaos/intensity)
        // 3. Begin compute pass
        // 4. Set pipeline
        // 5. Set bind group
        // 6. Dispatch work groups: (width / 8, height / 8) workgroups
        // 7. Toggle frame parity
        
        // Placeholder: just log
        self.logger.info("Reaction-diffusion step computed");
        
        // Toggle parity for next frame
        self.frame_parity = !self.frame_parity;
        
        Ok(())
    }
    
    /// # Responsibility
    /// Returns the current active texture for rendering/sampling.
    pub fn get_active_texture(&self) -> Result<&wgpu::TextureView, String> {
        // Return texture A or B depending on frame parity
        if self.frame_parity {
            self.texture_view_b.as_ref().ok_or_else(|| "Texture B not initialized".to_string())
        } else {
            self.texture_view_a.as_ref().ok_or_else(|| "Texture A not initialized".to_string())
        }
    }
    
    /// # Responsibility
    /// Resets the simulation with a seed pattern (e.g., random noise).
    pub fn reset_with_seed(&mut self, _queue: &wgpu::Queue, _seed_pattern: &[u8]) -> Result<(), String> {
        // TODO: Implement seed pattern upload
        // 1. Generate or use provided seed pattern
        // 2. Upload to texture A
        // 3. Clear texture B to zero
        
        self.logger.info("Reaction-diffusion reset with seed (TODO)");
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::tests::mocks::MockLogger;
    
    #[test]
    fn test_reaction_diffusion_config_defaults() {
        let config = ReactionDiffusionConfig::default();
        
        assert_eq!(config.resolution, (512, 512));
        assert_eq!(config.diffusion_a, 1.0);
        assert_eq!(config.diffusion_b, 0.5);
        assert_eq!(config.feed_rate, 0.055);
        assert_eq!(config.kill_rate, 0.062);
        assert_eq!(config.timestep, 1.0);
        
        match config.color_mapping {
            ColorMapping::Heatmap => {}
            _ => panic!("Default should be Heatmap"),
        }
    }
    
    #[test]
    fn test_reaction_diffusion_service_creation() {
        let config = ReactionDiffusionConfig::default();
        let logger = Arc::new(MockLogger::new());
        
        let service = ReactionDiffusionComputeService::new(config, logger.clone());
        
        assert!(service.compute_pipeline.is_none());
        assert!(!service.frame_parity);
        
        let messages = logger.get_messages();
        assert!(messages.iter().any(|m| m.contains("Creating ReactionDiffusionComputeService")));
    }
    
    #[test]
    fn test_color_mapping_types() {
        let grayscale = ColorMapping::Grayscale;
        let heatmap = ColorMapping::Heatmap;
        let qualia = ColorMapping::QualiaGradient;
        
        // Ensure all variants compile and are distinct
        match grayscale {
            ColorMapping::Grayscale => {}
            _ => panic!("Should be Grayscale"),
        }
        
        match heatmap {
            ColorMapping::Heatmap => {}
            _ => panic!("Should be Heatmap"),
        }
        
        match qualia {
            ColorMapping::QualiaGradient => {}
            _ => panic!("Should be QualiaGradient"),
        }
    }
}
