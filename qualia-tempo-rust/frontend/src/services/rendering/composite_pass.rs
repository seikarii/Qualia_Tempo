//! # Responsibility
//! Composite pass - combines all post-processing layers with tone mapping.
//!
//! ---
//!
//! Implements the final composition step: combines lighting, bloom, god rays,
//! applies ACES Filmic tone mapping (HDR → LDR), and performs TAA.

use wgpu;
use std::sync::Arc;
use crate::services::core::ILogger;

/// # Responsibility
/// Configuration for the composite pass.
#[derive(Debug, Clone)]
pub struct CompositeConfig {
    /// Enable tone mapping
    pub enable_tone_mapping: bool,
    
    /// Tone mapping operator (0 = ACES Filmic, 1 = Reinhard, 2 = Uncharted 2)
    pub tone_mapping_operator: u32,
    
    /// Exposure multiplier (0.0 - 4.0)
    pub exposure: f32,
    
    /// Enable Temporal Anti-Aliasing
    pub enable_taa: bool,
    
    /// TAA blend factor with history (0.0 - 1.0, higher = more blur)
    pub taa_blend_factor: f32,
    
    /// TAA variance clipping (reduces ghosting)
    pub taa_variance_clip: bool,
    
    /// Bloom contribution (0.0 - 2.0)
    pub bloom_strength: f32,
    
    /// God rays contribution (0.0 - 2.0)
    pub god_rays_strength: f32,
}

impl Default for CompositeConfig {
    fn default() -> Self {
        Self {
            enable_tone_mapping: true,
            tone_mapping_operator: 0, // ACES Filmic
            exposure: 1.0,
            enable_taa: true,
            taa_blend_factor: 0.1,
            taa_variance_clip: true,
            bloom_strength: 1.0,
            god_rays_strength: 0.5,
        }
    }
}

/// # Responsibility
/// Implements final scene composition with tone mapping and TAA.
///
/// ---
///
/// Combines all post-processing layers, applies ACES Filmic tone mapping
/// to convert HDR to LDR, and performs Temporal Anti-Aliasing.
pub struct CompositePass {
    config: CompositeConfig,
    logger: Arc<dyn ILogger>,
    
    // Render pipelines
    composite_pipeline: Option<wgpu::RenderPipeline>,
    taa_pipeline: Option<wgpu::RenderPipeline>,
    
    // Output texture (final LDR result)
    output_texture: Option<wgpu::TextureView>,
    
    // TAA history buffer (previous frame for temporal reprojection)
    taa_history: Option<wgpu::TextureView>,
}

impl CompositePass {
    /// # Responsibility
    /// Creates a new CompositePass with the given configuration.
    pub fn new(config: CompositeConfig, logger: Arc<dyn ILogger>) -> Self {
        logger.info("Creating CompositePass");
        
        Self {
            config,
            logger,
            composite_pipeline: None,
            taa_pipeline: None,
            output_texture: None,
            taa_history: None,
        }
    }
    
    /// # Responsibility
    /// Initializes the composite pass with wgpu device.
    pub fn initialize(
        &mut self,
        device: &wgpu::Device,
        width: u32,
        height: u32,
    ) -> Result<(), String> {
        self.logger.info("Initializing CompositePass");
        
        // Create output texture (LDR result - Bgra8UnormSrgb)
        let output_texture = device.create_texture(&wgpu::TextureDescriptor {
            label: Some("Composite Pass Output"),
            size: wgpu::Extent3d {
                width,
                height,
                depth_or_array_layers: 1,
            },
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: wgpu::TextureFormat::Bgra8UnormSrgb, // LDR output for presentation
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT | wgpu::TextureUsages::TEXTURE_BINDING,
            view_formats: &[],
        });
        
        self.output_texture = Some(output_texture.create_view(&wgpu::TextureViewDescriptor::default()));
        
        // Create TAA history buffer (if TAA enabled)
        if self.config.enable_taa {
            let taa_history = device.create_texture(&wgpu::TextureDescriptor {
                label: Some("TAA History Buffer"),
                size: wgpu::Extent3d {
                    width,
                    height,
                    depth_or_array_layers: 1,
                },
                mip_level_count: 1,
                sample_count: 1,
                dimension: wgpu::TextureDimension::D2,
                format: wgpu::TextureFormat::Rgba16Float, // HDR history
                usage: wgpu::TextureUsages::RENDER_ATTACHMENT | wgpu::TextureUsages::TEXTURE_BINDING,
                view_formats: &[],
            });
            
            self.taa_history = Some(taa_history.create_view(&wgpu::TextureViewDescriptor::default()));
        }
        
        // Create render pipelines
        self.composite_pipeline = Some(self.create_composite_pipeline(device)?);
        
        if self.config.enable_taa {
            self.taa_pipeline = Some(self.create_taa_pipeline(device)?);
        }
        
        self.logger.info("CompositePass initialized successfully");
        Ok(())
    }
    
    /// # Responsibility
    /// Creates the composition pipeline (layer blending + tone mapping).
    fn create_composite_pipeline(&self, device: &wgpu::Device) -> Result<wgpu::RenderPipeline, String> {
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Composite Shader"),
            source: wgpu::ShaderSource::Wgsl(include_str!("shaders/composite.wgsl").into()),
        });
        
        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Composite Pipeline Layout"),
            bind_group_layouts: &[],
            push_constant_ranges: &[],
        });
        
        let pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("Composite Pipeline"),
            layout: Some(&pipeline_layout),
            vertex: wgpu::VertexState {
                module: &shader,
                entry_point: "vs_main",
                buffers: &[],
                compilation_options: wgpu::PipelineCompilationOptions::default(),
            },
            fragment: Some(wgpu::FragmentState {
                module: &shader,
                entry_point: "fs_main",
                targets: &[Some(wgpu::ColorTargetState {
                    format: wgpu::TextureFormat::Rgba16Float,
                    blend: None, // No blending, direct write
                    write_mask: wgpu::ColorWrites::ALL,
                })],
                compilation_options: wgpu::PipelineCompilationOptions::default(),
            }),
            primitive: wgpu::PrimitiveState {
                topology: wgpu::PrimitiveTopology::TriangleList,
                front_face: wgpu::FrontFace::Ccw,
                cull_mode: Some(wgpu::Face::Back),
                ..Default::default()
            },
            depth_stencil: None,
            multisample: wgpu::MultisampleState::default(),
            multiview: None,
            cache: None,
        });
        
        Ok(pipeline)
    }
    
    /// # Responsibility
    /// Creates the TAA pipeline (temporal reprojection + variance clipping).
    fn create_taa_pipeline(&self, device: &wgpu::Device) -> Result<wgpu::RenderPipeline, String> {
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("TAA Shader"),
            source: wgpu::ShaderSource::Wgsl(include_str!("shaders/taa.wgsl").into()),
        });
        
        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("TAA Pipeline Layout"),
            bind_group_layouts: &[],
            push_constant_ranges: &[],
        });
        
        let pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("TAA Pipeline"),
            layout: Some(&pipeline_layout),
            vertex: wgpu::VertexState {
                module: &shader,
                entry_point: "vs_main",
                buffers: &[],
                compilation_options: wgpu::PipelineCompilationOptions::default(),
            },
            fragment: Some(wgpu::FragmentState {
                module: &shader,
                entry_point: "fs_main",
                targets: &[Some(wgpu::ColorTargetState {
                    format: wgpu::TextureFormat::Bgra8UnormSrgb,
                    blend: None,
                    write_mask: wgpu::ColorWrites::ALL,
                })],
                compilation_options: wgpu::PipelineCompilationOptions::default(),
            }),
            primitive: wgpu::PrimitiveState {
                topology: wgpu::PrimitiveTopology::TriangleList,
                front_face: wgpu::FrontFace::Ccw,
                cull_mode: Some(wgpu::Face::Back),
                ..Default::default()
            },
            depth_stencil: None,
            multisample: wgpu::MultisampleState::default(),
            multiview: None,
            cache: None,
        });
        
        Ok(pipeline)
    }
    
    /// # Responsibility
    /// Executes the full composition pipeline.
    ///
    /// ---
    ///
    /// 1. Combines lighting + bloom + god rays with configurable strengths
    /// 2. Applies ACES Filmic tone mapping (HDR → LDR)
    /// 3. Performs TAA with velocity buffer reprojection (if enabled)
    /// 4. Returns final LDR result ready for presentation
    pub fn execute(
        &mut self,
        encoder: &mut wgpu::CommandEncoder,
        _lighting_hdr: &wgpu::TextureView,
        _bloom_hdr: &wgpu::TextureView,
        _god_rays_hdr: &wgpu::TextureView,
        _velocity_buffer: &wgpu::TextureView,
    ) -> Result<&wgpu::TextureView, String> {
        let output = self.output_texture.as_ref().ok_or("CompositePass not initialized")?;
        
        // TODO: Implement composite pipeline
        // Stage 1: Composite HDR layers
        //   - Base: lighting_hdr
        //   - Additive: bloom_hdr * bloom_strength
        //   - Additive: god_rays_hdr * god_rays_strength
        //   - Result: combined_hdr (Rgba16Float)
        
        // Stage 2: Tone mapping (HDR → LDR)
        //   - Apply ACES Filmic operator
        //   - Apply exposure multiplier
        //   - Output: tone_mapped_ldr (Rgba16Float for TAA input)
        
        // Stage 3: TAA (if enabled)
        //   - Reproject previous frame using velocity buffer
        //   - Variance clipping to prevent ghosting
        //   - Blend current frame with history (blend_factor)
        //   - Update history buffer for next frame
        //   - Output: final_ldr (Bgra8UnormSrgb)
        
        // For now, just clear to dark gray (placeholder)
        {
            let _render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("Composite Pass Placeholder"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: output,
                    resolve_target: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(wgpu::Color {
                            r: 0.1,
                            g: 0.1,
                            b: 0.1,
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
        
        Ok(output)
    }
    
    /// # Responsibility
    /// Resizes the composite output and TAA history textures.
    pub fn resize(&mut self, device: &wgpu::Device, width: u32, height: u32) -> Result<(), String> {
        self.logger.info(&format!("Resizing CompositePass to {}x{}", width, height));
        
        // Recreate output texture
        let output_texture = device.create_texture(&wgpu::TextureDescriptor {
            label: Some("Composite Pass Output"),
            size: wgpu::Extent3d {
                width,
                height,
                depth_or_array_layers: 1,
            },
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: wgpu::TextureFormat::Bgra8UnormSrgb,
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT | wgpu::TextureUsages::TEXTURE_BINDING,
            view_formats: &[],
        });
        
        self.output_texture = Some(output_texture.create_view(&wgpu::TextureViewDescriptor::default()));
        
        // Recreate TAA history buffer
        if self.config.enable_taa {
            let taa_history = device.create_texture(&wgpu::TextureDescriptor {
                label: Some("TAA History Buffer"),
                size: wgpu::Extent3d {
                    width,
                    height,
                    depth_or_array_layers: 1,
                },
                mip_level_count: 1,
                sample_count: 1,
                dimension: wgpu::TextureDimension::D2,
                format: wgpu::TextureFormat::Rgba16Float,
                usage: wgpu::TextureUsages::RENDER_ATTACHMENT | wgpu::TextureUsages::TEXTURE_BINDING,
                view_formats: &[],
            });
            
            self.taa_history = Some(taa_history.create_view(&wgpu::TextureViewDescriptor::default()));
        }
        
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::tests::mocks::MockLogger;
    
    #[test]
    fn test_composite_config_defaults() {
        let config = CompositeConfig::default();
        
        assert!(config.enable_tone_mapping);
        assert_eq!(config.tone_mapping_operator, 0);
        assert_eq!(config.exposure, 1.0);
        assert!(config.enable_taa);
        assert_eq!(config.taa_blend_factor, 0.1);
        assert!(config.taa_variance_clip);
        assert_eq!(config.bloom_strength, 1.0);
        assert_eq!(config.god_rays_strength, 0.5);
    }
    
    #[test]
    fn test_composite_pass_creation() {
        let config = CompositeConfig::default();
        let logger = Arc::new(MockLogger::new());
        
        let pass = CompositePass::new(config, logger.clone());
        
        assert!(pass.composite_pipeline.is_none());
        assert!(pass.taa_pipeline.is_none());
        assert!(pass.output_texture.is_none());
        assert!(pass.taa_history.is_none());
        
        let messages = logger.get_messages();
        assert!(messages.iter().any(|m| m.contains("Creating CompositePass")));
    }
    
    #[test]
    fn test_composite_config_custom_values() {
        let config = CompositeConfig {
            enable_tone_mapping: false,
            tone_mapping_operator: 2, // Uncharted 2
            exposure: 2.0,
            enable_taa: false,
            taa_blend_factor: 0.2,
            taa_variance_clip: false,
            bloom_strength: 1.5,
            god_rays_strength: 0.8,
        };
        
        assert!(!config.enable_tone_mapping);
        assert_eq!(config.tone_mapping_operator, 2);
        assert_eq!(config.exposure, 2.0);
        assert!(!config.enable_taa);
        assert_eq!(config.taa_blend_factor, 0.2);
        assert!(!config.taa_variance_clip);
        assert_eq!(config.bloom_strength, 1.5);
        assert_eq!(config.god_rays_strength, 0.8);
    }
}
