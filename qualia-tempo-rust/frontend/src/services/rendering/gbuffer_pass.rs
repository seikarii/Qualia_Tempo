//! # Responsibility
//! G-Buffer pass for deferred rendering - geometry stage.
//!
//! ---
//!
//! Renders scene geometry to multiple render targets (G-Buffer textures):
//! - Albedo (RGB) + Roughness (A)
//! - Normal (RGB) + Metallic (A)
//! - Position (RGB) + AO (A)
//! - Velocity (RG) for motion blur and TAA

use wgpu;
use std::sync::Arc;
use crate::services::core::ILogger;

/// # Responsibility
/// Configuration for G-Buffer pass.
#[derive(Debug, Clone)]
pub struct GBufferConfig {
    /// G-Buffer resolution width
    pub width: u32,
    
    /// G-Buffer resolution height
    pub height: u32,
    
    /// Enable velocity buffer for motion blur
    pub velocity_enabled: bool,
}

impl Default for GBufferConfig {
    fn default() -> Self {
        Self {
            width: 1920,
            height: 1080,
            velocity_enabled: true,
        }
    }
}

/// # Responsibility
/// G-Buffer textures for deferred rendering.
pub struct GBufferTextures {
    /// Albedo (RGB) + Roughness (A)
    pub albedo_roughness: wgpu::TextureView,
    
    /// Normal (RGB) + Metallic (A)
    pub normal_metallic: wgpu::TextureView,
    
    /// World Position (RGB) + AO (A)
    pub position_ao: wgpu::TextureView,
    
    /// Velocity (RG) for motion blur/TAA
    pub velocity: Option<wgpu::TextureView>,
    
    /// Depth buffer
    pub depth: wgpu::TextureView,
}

/// # Responsibility
/// Deferred rendering G-Buffer pass.
pub struct GBufferPass {
    config: GBufferConfig,
    logger: Arc<dyn ILogger>,
    
    textures: Option<GBufferTextures>,
    render_pipeline: Option<wgpu::RenderPipeline>,
}

impl GBufferPass {
    /// # Responsibility
    /// Creates a new G-Buffer pass.
    pub fn new(config: GBufferConfig, logger: Arc<dyn ILogger>) -> Self {
        Self {
            config,
            logger,
            textures: None,
            render_pipeline: None,
        }
    }
    
    /// # Responsibility
    /// Initializes G-Buffer textures and pipeline.
    pub fn initialize(&mut self, device: &wgpu::Device) -> Result<(), String> {
        self.logger.info("Initializing G-Buffer pass...");
        
        // Create G-Buffer textures
        let textures = self.create_gbuffer_textures(device)?;
        
        // Create render pipeline (placeholder - will be replaced with full shader pipeline)
        let render_pipeline = self.create_render_pipeline(device)?;
        
        self.textures = Some(textures);
        self.render_pipeline = Some(render_pipeline);
        
        self.logger.info(&format!(
            "G-Buffer pass initialized: {}x{}, Velocity: {}",
            self.config.width, self.config.height, self.config.velocity_enabled
        ));
        
        Ok(())
    }
    
    /// # Responsibility
    /// Creates all G-Buffer textures.
    fn create_gbuffer_textures(&self, device: &wgpu::Device) -> Result<GBufferTextures, String> {
        let size = wgpu::Extent3d {
            width: self.config.width,
            height: self.config.height,
            depth_or_array_layers: 1,
        };
        
        // Albedo + Roughness texture
        let albedo_roughness_texture = device.create_texture(&wgpu::TextureDescriptor {
            label: Some("G-Buffer Albedo+Roughness"),
            size,
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: wgpu::TextureFormat::Rgba8UnormSrgb,
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT | wgpu::TextureUsages::TEXTURE_BINDING,
            view_formats: &[],
        });
        
        // Normal + Metallic texture
        let normal_metallic_texture = device.create_texture(&wgpu::TextureDescriptor {
            label: Some("G-Buffer Normal+Metallic"),
            size,
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: wgpu::TextureFormat::Rgba16Float,
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT | wgpu::TextureUsages::TEXTURE_BINDING,
            view_formats: &[],
        });
        
        // Position + AO texture
        let position_ao_texture = device.create_texture(&wgpu::TextureDescriptor {
            label: Some("G-Buffer Position+AO"),
            size,
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: wgpu::TextureFormat::Rgba32Float,
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT | wgpu::TextureUsages::TEXTURE_BINDING,
            view_formats: &[],
        });
        
        // Velocity texture (optional)
        let velocity_texture = if self.config.velocity_enabled {
            Some(device.create_texture(&wgpu::TextureDescriptor {
                label: Some("G-Buffer Velocity"),
                size,
                mip_level_count: 1,
                sample_count: 1,
                dimension: wgpu::TextureDimension::D2,
                format: wgpu::TextureFormat::Rg16Float,
                usage: wgpu::TextureUsages::RENDER_ATTACHMENT | wgpu::TextureUsages::TEXTURE_BINDING,
                view_formats: &[],
            }))
        } else {
            None
        };
        
        // Depth texture
        let depth_texture = device.create_texture(&wgpu::TextureDescriptor {
            label: Some("G-Buffer Depth"),
            size,
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: wgpu::TextureFormat::Depth32Float,
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT | wgpu::TextureUsages::TEXTURE_BINDING,
            view_formats: &[],
        });
        
        Ok(GBufferTextures {
            albedo_roughness: albedo_roughness_texture.create_view(&wgpu::TextureViewDescriptor::default()),
            normal_metallic: normal_metallic_texture.create_view(&wgpu::TextureViewDescriptor::default()),
            position_ao: position_ao_texture.create_view(&wgpu::TextureViewDescriptor::default()),
            velocity: velocity_texture.map(|tex| tex.create_view(&wgpu::TextureViewDescriptor::default())),
            depth: depth_texture.create_view(&wgpu::TextureViewDescriptor::default()),
        })
    }
    
    /// # Responsibility
    /// Creates the render pipeline for G-Buffer pass.
    ///
    /// ---
    ///
    /// Placeholder implementation - will be replaced with full shader pipeline in future phases.
    fn create_render_pipeline(&self, device: &wgpu::Device) -> Result<wgpu::RenderPipeline, String> {
        // Placeholder shader (will be replaced with WGSL shaders)
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("G-Buffer Shader"),
            source: wgpu::ShaderSource::Wgsl(include_str!("shaders/gbuffer.wgsl").into()),
        });
        
        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("G-Buffer Pipeline Layout"),
            bind_group_layouts: &[],
            push_constant_ranges: &[],
        });
        
        let pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("G-Buffer Pipeline"),
            layout: Some(&pipeline_layout),
            vertex: wgpu::VertexState {
                module: &shader,
                entry_point: Some("vs_main"),
                buffers: &[],
                compilation_options: wgpu::PipelineCompilationOptions::default(),
            },
            fragment: Some(wgpu::FragmentState {
                module: &shader,
                entry_point: Some("fs_main"),
                targets: &[
                    Some(wgpu::ColorTargetState {
                        format: wgpu::TextureFormat::Rgba8UnormSrgb,
                        blend: None,
                        write_mask: wgpu::ColorWrites::ALL,
                    }),
                    Some(wgpu::ColorTargetState {
                        format: wgpu::TextureFormat::Rgba16Float,
                        blend: None,
                        write_mask: wgpu::ColorWrites::ALL,
                    }),
                    Some(wgpu::ColorTargetState {
                        format: wgpu::TextureFormat::Rgba32Float,
                        blend: None,
                        write_mask: wgpu::ColorWrites::ALL,
                    }),
                ],
                compilation_options: wgpu::PipelineCompilationOptions::default(),
            }),
            primitive: wgpu::PrimitiveState {
                topology: wgpu::PrimitiveTopology::TriangleList,
                strip_index_format: None,
                front_face: wgpu::FrontFace::Ccw,
                cull_mode: Some(wgpu::Face::Back),
                polygon_mode: wgpu::PolygonMode::Fill,
                unclipped_depth: false,
                conservative: false,
            },
            depth_stencil: Some(wgpu::DepthStencilState {
                format: wgpu::TextureFormat::Depth32Float,
                depth_write_enabled: true,
                depth_compare: wgpu::CompareFunction::Less,
                stencil: wgpu::StencilState::default(),
                bias: wgpu::DepthBiasState::default(),
            }),
            multisample: wgpu::MultisampleState::default(),
            multiview: None,
            cache: None,
        });
        
        Ok(pipeline)
    }
    
    /// # Responsibility
    /// Executes the G-Buffer pass, rendering geometry to MRTs.
    ///
    /// ---
    ///
    /// Placeholder implementation - will be populated with actual geometry rendering.
    pub fn execute(&self, encoder: &mut wgpu::CommandEncoder) -> Result<(), String> {
        let textures = self.textures.as_ref().ok_or("G-Buffer not initialized")?;
        let pipeline = self.render_pipeline.as_ref().ok_or("Pipeline not initialized")?;
        
        let mut render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
            label: Some("G-Buffer Pass"),
            color_attachments: &[
                Some(wgpu::RenderPassColorAttachment {
                    view: &textures.albedo_roughness,
                    resolve_target: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(wgpu::Color::BLACK),
                        store: wgpu::StoreOp::Store,
                    },
                }),
                Some(wgpu::RenderPassColorAttachment {
                    view: &textures.normal_metallic,
                    resolve_target: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(wgpu::Color::BLACK),
                        store: wgpu::StoreOp::Store,
                    },
                }),
                Some(wgpu::RenderPassColorAttachment {
                    view: &textures.position_ao,
                    resolve_target: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(wgpu::Color::BLACK),
                        store: wgpu::StoreOp::Store,
                    },
                }),
            ],
            depth_stencil_attachment: Some(wgpu::RenderPassDepthStencilAttachment {
                view: &textures.depth,
                depth_ops: Some(wgpu::Operations {
                    load: wgpu::LoadOp::Clear(1.0),
                    store: wgpu::StoreOp::Store,
                }),
                stencil_ops: None,
            }),
            timestamp_writes: None,
            occlusion_query_set: None,
        });
        
        render_pass.set_pipeline(pipeline);
        
        // TODO: Render geometry (particles, SDF avatars, environment)
        // render_pass.draw(...);
        
        Ok(())
    }
    
    /// # Responsibility
    /// Resizes G-Buffer textures.
    pub fn resize(&mut self, device: &wgpu::Device, width: u32, height: u32) -> Result<(), String> {
        self.config.width = width;
        self.config.height = height;
        
        // Recreate textures with new size
        let textures = self.create_gbuffer_textures(device)?;
        self.textures = Some(textures);
        
        self.logger.info(&format!("G-Buffer resized: {}x{}", width, height));
        
        Ok(())
    }
    
    /// # Responsibility
    /// Gets reference to G-Buffer textures.
    pub fn textures(&self) -> Option<&GBufferTextures> {
        self.textures.as_ref()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::core::MockLogger;
    
    #[test]
    fn test_gbuffer_config_defaults() {
        let config = GBufferConfig::default();
        assert_eq!(config.width, 1920);
        assert_eq!(config.height, 1080);
        assert!(config.velocity_enabled);
    }
    
    #[test]
    fn test_gbuffer_pass_creation() {
        let config = GBufferConfig::default();
        let logger = Arc::new(MockLogger::new());
        
        let pass = GBufferPass::new(config, logger);
        
        assert!(pass.textures.is_none());
        assert!(pass.render_pipeline.is_none());
    }
}
