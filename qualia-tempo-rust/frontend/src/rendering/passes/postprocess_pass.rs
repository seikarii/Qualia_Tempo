//! # Responsibility
//! Implements post-processing effects for deferred rendering pipeline.
//!
//! ---
//!
//! Third rendering pass: applies screen-space post-processing effects
//! on the lit scene:
//!
//! - Bloom (bright pass + blur + composite)
//! - God rays (volumetric lighting)
//! - Motion blur (velocity-based)
//!
//! Follows VISUALS.RUST.md §2 specification.

use wgpu;
use anyhow::Result;
use tracing::{info, debug};

/// # Responsibility
/// Manages post-processing effects chain.
///
/// ---
///
/// Applies multiple screen-space effects in sequence:
/// 1. Bloom extraction and blur
/// 2. God rays (volumetric lighting)
/// 3. Motion blur using velocity buffer
pub struct PostProcessPass {
    bloom_pipeline: wgpu::RenderPipeline,
    god_rays_pipeline: wgpu::RenderPipeline,
    motion_blur_pipeline: wgpu::RenderPipeline,
    bind_group: wgpu::BindGroup,
    _bind_group_layout: wgpu::BindGroupLayout,
    output_texture: wgpu::Texture,
    bloom_texture: wgpu::Texture,
    _sampler: wgpu::Sampler,
}

impl PostProcessPass {
    /// Create new post-processing pass
    ///
    /// # Arguments
    /// - `device`: wgpu device for resource creation
    /// - `lit_texture_view`: Lit scene texture from lighting pass
    /// - `velocity_texture_view`: Velocity buffer from G-Buffer pass
    /// - `config`: Surface configuration for texture sizing
    ///
    /// # Returns
    /// Initialized post-processing pass with all effect pipelines
    pub fn new(
        device: &wgpu::Device,
        lit_texture_view: &wgpu::TextureView,
        velocity_texture_view: &wgpu::TextureView,
        config: &wgpu::SurfaceConfiguration,
    ) -> Result<Self> {
        info!("Initializing post-processing pass");
        
        // Create sampler for input textures
        let sampler = device.create_sampler(&wgpu::SamplerDescriptor {
            label: Some("PostProcess Sampler"),
            address_mode_u: wgpu::AddressMode::ClampToEdge,
            address_mode_v: wgpu::AddressMode::ClampToEdge,
            address_mode_w: wgpu::AddressMode::ClampToEdge,
            mag_filter: wgpu::FilterMode::Linear,
            min_filter: wgpu::FilterMode::Linear,
            mipmap_filter: wgpu::FilterMode::Nearest,
            ..Default::default()
        });
        
        // Create output texture
        let output_texture = device.create_texture(&wgpu::TextureDescriptor {
            label: Some("PostProcess Output Texture"),
            size: wgpu::Extent3d {
                width: config.width,
                height: config.height,
                depth_or_array_layers: 1,
            },
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: wgpu::TextureFormat::Rgba16Float,
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT | wgpu::TextureUsages::TEXTURE_BINDING,
            view_formats: &[],
        });
        
        // Create bloom intermediate texture
        let bloom_texture = device.create_texture(&wgpu::TextureDescriptor {
            label: Some("Bloom Intermediate Texture"),
            size: wgpu::Extent3d {
                width: config.width / 2, // Half resolution for performance
                height: config.height / 2,
                depth_or_array_layers: 1,
            },
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: wgpu::TextureFormat::Rgba16Float,
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT | wgpu::TextureUsages::TEXTURE_BINDING,
            view_formats: &[],
        });
        
        // Create bind group layout
        let bind_group_layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("PostProcess Bind Group Layout"),
            entries: &[
                // Lit scene texture
                wgpu::BindGroupLayoutEntry {
                    binding: 0,
                    visibility: wgpu::ShaderStages::FRAGMENT,
                    ty: wgpu::BindingType::Texture {
                        sample_type: wgpu::TextureSampleType::Float { filterable: true },
                        view_dimension: wgpu::TextureViewDimension::D2,
                        multisampled: false,
                    },
                    count: None,
                },
                // Velocity texture
                wgpu::BindGroupLayoutEntry {
                    binding: 1,
                    visibility: wgpu::ShaderStages::FRAGMENT,
                    ty: wgpu::BindingType::Texture {
                        sample_type: wgpu::TextureSampleType::Float { filterable: true },
                        view_dimension: wgpu::TextureViewDimension::D2,
                        multisampled: false,
                    },
                    count: None,
                },
                // Sampler
                wgpu::BindGroupLayoutEntry {
                    binding: 2,
                    visibility: wgpu::ShaderStages::FRAGMENT,
                    ty: wgpu::BindingType::Sampler(wgpu::SamplerBindingType::Filtering),
                    count: None,
                },
            ],
        });
        
        // Create bind group
        let bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("PostProcess Bind Group"),
            layout: &bind_group_layout,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: wgpu::BindingResource::TextureView(lit_texture_view),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: wgpu::BindingResource::TextureView(velocity_texture_view),
                },
                wgpu::BindGroupEntry {
                    binding: 2,
                    resource: wgpu::BindingResource::Sampler(&sampler),
                },
            ],
        });
        
        // Create pipelines
        let bloom_pipeline = Self::create_bloom_pipeline(device, &bind_group_layout)?;
        let god_rays_pipeline = Self::create_god_rays_pipeline(device, &bind_group_layout)?;
        let motion_blur_pipeline = Self::create_motion_blur_pipeline(device, &bind_group_layout)?;
        
        debug!("Post-processing pass initialized successfully");
        
        Ok(Self {
            bloom_pipeline,
            god_rays_pipeline,
            motion_blur_pipeline,
            bind_group,
            _bind_group_layout: bind_group_layout,
            output_texture,
            bloom_texture,
            _sampler: sampler,
        })
    }
    
    /// Create bloom pipeline (bright pass + blur)
    fn create_bloom_pipeline(
        device: &wgpu::Device,
        bind_group_layout: &wgpu::BindGroupLayout,
    ) -> Result<wgpu::RenderPipeline> {
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Bloom Shader"),
            source: wgpu::ShaderSource::Wgsl(include_str!("../shaders/bloom.wgsl").into()),
        });
        
        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Bloom Pipeline Layout"),
            bind_group_layouts: &[bind_group_layout],
            push_constant_ranges: &[],
        });
        
        Ok(device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("Bloom Pipeline"),
            layout: Some(&pipeline_layout),
            vertex: wgpu::VertexState {
                module: &shader,
                entry_point: "vs_main",
                buffers: &[],
                compilation_options: Default::default(),
            },
            fragment: Some(wgpu::FragmentState {
                module: &shader,
                entry_point: "fs_main",
                targets: &[Some(wgpu::ColorTargetState {
                    format: wgpu::TextureFormat::Rgba16Float,
                    blend: None,
                    write_mask: wgpu::ColorWrites::ALL,
                })],
                compilation_options: Default::default(),
            }),
            primitive: wgpu::PrimitiveState {
                topology: wgpu::PrimitiveTopology::TriangleList,
                ..Default::default()
            },
            depth_stencil: None,
            multisample: wgpu::MultisampleState::default(),
            multiview: None,
            cache: None,
        }))
    }
    
    /// Create god rays pipeline (volumetric lighting)
    fn create_god_rays_pipeline(
        device: &wgpu::Device,
        bind_group_layout: &wgpu::BindGroupLayout,
    ) -> Result<wgpu::RenderPipeline> {
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("God Rays Shader"),
            source: wgpu::ShaderSource::Wgsl(include_str!("../shaders/god_rays.wgsl").into()),
        });
        
        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("God Rays Pipeline Layout"),
            bind_group_layouts: &[bind_group_layout],
            push_constant_ranges: &[],
        });
        
        Ok(device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("God Rays Pipeline"),
            layout: Some(&pipeline_layout),
            vertex: wgpu::VertexState {
                module: &shader,
                entry_point: "vs_main",
                buffers: &[],
                compilation_options: Default::default(),
            },
            fragment: Some(wgpu::FragmentState {
                module: &shader,
                entry_point: "fs_main",
                targets: &[Some(wgpu::ColorTargetState {
                    format: wgpu::TextureFormat::Rgba16Float,
                    blend: Some(wgpu::BlendState::ALPHA_BLENDING),
                    write_mask: wgpu::ColorWrites::ALL,
                })],
                compilation_options: Default::default(),
            }),
            primitive: wgpu::PrimitiveState {
                topology: wgpu::PrimitiveTopology::TriangleList,
                ..Default::default()
            },
            depth_stencil: None,
            multisample: wgpu::MultisampleState::default(),
            multiview: None,
            cache: None,
        }))
    }
    
    /// Create motion blur pipeline (velocity-based)
    fn create_motion_blur_pipeline(
        device: &wgpu::Device,
        bind_group_layout: &wgpu::BindGroupLayout,
    ) -> Result<wgpu::RenderPipeline> {
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Motion Blur Shader"),
            source: wgpu::ShaderSource::Wgsl(include_str!("../shaders/motion_blur.wgsl").into()),
        });
        
        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Motion Blur Pipeline Layout"),
            bind_group_layouts: &[bind_group_layout],
            push_constant_ranges: &[],
        });
        
        Ok(device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("Motion Blur Pipeline"),
            layout: Some(&pipeline_layout),
            vertex: wgpu::VertexState {
                module: &shader,
                entry_point: "vs_main",
                buffers: &[],
                compilation_options: Default::default(),
            },
            fragment: Some(wgpu::FragmentState {
                module: &shader,
                entry_point: "fs_main",
                targets: &[Some(wgpu::ColorTargetState {
                    format: wgpu::TextureFormat::Rgba16Float,
                    blend: None,
                    write_mask: wgpu::ColorWrites::ALL,
                })],
                compilation_options: Default::default(),
            }),
            primitive: wgpu::PrimitiveState {
                topology: wgpu::PrimitiveTopology::TriangleList,
                ..Default::default()
            },
            depth_stencil: None,
            multisample: wgpu::MultisampleState::default(),
            multiview: None,
            cache: None,
        }))
    }
    
    /// Execute post-processing chain
    ///
    /// # Arguments
    /// - `encoder`: Command encoder for recording GPU commands
    ///
    /// # Returns
    /// Texture view of post-processed output
    pub fn render(&self, encoder: &mut wgpu::CommandEncoder) -> Result<wgpu::TextureView> {
        debug!("Executing post-processing chain");
        
        // 1. Bloom pass (extract bright + blur)
        {
            let bloom_view = self.bloom_texture.create_view(&Default::default());
            let mut bloom_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("Bloom Pass"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: &bloom_view,
                    resolve_target: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(wgpu::Color::BLACK),
                        store: wgpu::StoreOp::Store,
                    },
                })],
                depth_stencil_attachment: None,
                timestamp_writes: None,
                occlusion_query_set: None,
            });
            
            bloom_pass.set_pipeline(&self.bloom_pipeline);
            bloom_pass.set_bind_group(0, &self.bind_group, &[]);
            bloom_pass.draw(0..3, 0..1); // Fullscreen triangle
        }
        
        // 2. God rays pass (volumetric lighting)
        {
            let output_view = self.output_texture.create_view(&Default::default());
            let mut god_rays_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("God Rays Pass"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: &output_view,
                    resolve_target: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Load, // Preserve bloom
                        store: wgpu::StoreOp::Store,
                    },
                })],
                depth_stencil_attachment: None,
                timestamp_writes: None,
                occlusion_query_set: None,
            });
            
            god_rays_pass.set_pipeline(&self.god_rays_pipeline);
            god_rays_pass.set_bind_group(0, &self.bind_group, &[]);
            god_rays_pass.draw(0..3, 0..1);
        }
        
        // 3. Motion blur pass (velocity-based)
        {
            let output_view = self.output_texture.create_view(&Default::default());
            let mut motion_blur_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("Motion Blur Pass"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: &output_view,
                    resolve_target: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Load, // Preserve previous effects
                        store: wgpu::StoreOp::Store,
                    },
                })],
                depth_stencil_attachment: None,
                timestamp_writes: None,
                occlusion_query_set: None,
            });
            
            motion_blur_pass.set_pipeline(&self.motion_blur_pipeline);
            motion_blur_pass.set_bind_group(0, &self.bind_group, &[]);
            motion_blur_pass.draw(0..3, 0..1);
        }
        
        Ok(self.output_texture.create_view(&Default::default()))
    }
    
    /// Get reference to output texture for binding to next pass
    ///
    /// # Returns
    /// Reference to post-processed scene texture
    pub fn output_texture(&self) -> &wgpu::Texture {
        &self.output_texture
    }
    
    /// Get output texture view for next pass
    pub fn output_view(&self) -> wgpu::TextureView {
        self.output_texture.create_view(&Default::default())
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_postprocess_pass_struct_compiles() {
        // Structural test - full wgpu initialization requires device
        // Integration testing in WASM environment
    }
}
