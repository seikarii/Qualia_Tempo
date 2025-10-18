//! # Responsibility
//! Implements the lighting pass for deferred rendering pipeline.
//!
//! ---
//!
//! Second rendering pass: applies deferred lighting calculations using
//! G-Buffer textures (position, normal, albedo). Outputs lit scene color.
//! Follows VISUALS.RUST.md §2 specification.

use wgpu;
use anyhow::Result;
use tracing::{info, debug};
use super::gbuffer_pass::GBufferViews;

/// # Responsibility
/// Manages deferred lighting pass and output texture.
///
/// ---
///
/// Reads G-Buffer textures and applies lighting calculations:
/// - Direct lighting (directional, point, spot lights)
/// - Ambient occlusion (HBAO)
/// - Screen-space reflections (SSR)
pub struct LightingPass {
    pipeline: wgpu::RenderPipeline,
    bind_group: wgpu::BindGroup,
    _bind_group_layout: wgpu::BindGroupLayout,
    output_texture: wgpu::Texture,
    _sampler: wgpu::Sampler,
}

impl LightingPass {
    /// Create new lighting pass
    ///
    /// # Arguments
    /// - `device`: wgpu device for resource creation
    /// - `gbuffer_views`: G-Buffer texture views for sampling
    /// - `config`: Surface configuration for texture sizing
    ///
    /// # Returns
    /// Initialized lighting pass with pipeline and output texture
    pub fn new(
        device: &wgpu::Device,
        gbuffer_views: &GBufferViews,
        config: &wgpu::SurfaceConfiguration,
    ) -> Result<Self> {
        info!("Initializing lighting pass");
        
        // Create sampler for G-Buffer textures
        let sampler = device.create_sampler(&wgpu::SamplerDescriptor {
            label: Some("Lighting Sampler"),
            address_mode_u: wgpu::AddressMode::ClampToEdge,
            address_mode_v: wgpu::AddressMode::ClampToEdge,
            address_mode_w: wgpu::AddressMode::ClampToEdge,
            mag_filter: wgpu::FilterMode::Linear,
            min_filter: wgpu::FilterMode::Linear,
            mipmap_filter: wgpu::FilterMode::Nearest,
            ..Default::default()
        });
        
        // Create bind group layout
        let bind_group_layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("Lighting Bind Group Layout"),
            entries: &[
                // Position texture
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
                // Normal texture
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
                // Albedo texture
                wgpu::BindGroupLayoutEntry {
                    binding: 2,
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
                    binding: 3,
                    visibility: wgpu::ShaderStages::FRAGMENT,
                    ty: wgpu::BindingType::Sampler(wgpu::SamplerBindingType::Filtering),
                    count: None,
                },
            ],
        });
        
        // Create bind group
        let bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("Lighting Bind Group"),
            layout: &bind_group_layout,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: wgpu::BindingResource::TextureView(&gbuffer_views.position),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: wgpu::BindingResource::TextureView(&gbuffer_views.normal),
                },
                wgpu::BindGroupEntry {
                    binding: 2,
                    resource: wgpu::BindingResource::TextureView(&gbuffer_views.albedo),
                },
                wgpu::BindGroupEntry {
                    binding: 3,
                    resource: wgpu::BindingResource::Sampler(&sampler),
                },
            ],
        });
        
        // Create output texture
        let output_texture = device.create_texture(&wgpu::TextureDescriptor {
            label: Some("Lighting Output Texture"),
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
        
        // Create render pipeline
        let pipeline = Self::create_pipeline(device, &bind_group_layout)?;
        
        debug!("Lighting pass initialized successfully");
        
        Ok(Self {
            pipeline,
            bind_group,
            _bind_group_layout: bind_group_layout,
            output_texture,
            _sampler: sampler,
        })
    }
    
    /// Create lighting render pipeline
    fn create_pipeline(
        device: &wgpu::Device,
        bind_group_layout: &wgpu::BindGroupLayout,
    ) -> Result<wgpu::RenderPipeline> {
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Lighting Shader"),
            source: wgpu::ShaderSource::Wgsl(include_str!("../shaders/lighting.wgsl").into()),
        });
        
        let layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Lighting Pipeline Layout"),
            bind_group_layouts: &[bind_group_layout],
            push_constant_ranges: &[],
        });
        
        let pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("Lighting Pipeline"),
            layout: Some(&layout),
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
                strip_index_format: None,
                front_face: wgpu::FrontFace::Ccw,
                cull_mode: None,
                unclipped_depth: false,
                polygon_mode: wgpu::PolygonMode::Fill,
                conservative: false,
            },
            depth_stencil: None,
            multisample: wgpu::MultisampleState {
                count: 1,
                mask: !0,
                alpha_to_coverage_enabled: false,
            },
            multiview: None,
            cache: None,
        });
        
        Ok(pipeline)
    }
    
    /// Execute lighting render pass
    ///
    /// # Arguments
    /// - `encoder`: Command encoder for recording draw commands
    ///
    /// # Returns
    /// Result indicating success or failure
    pub fn render(&self, encoder: &mut wgpu::CommandEncoder) -> Result<()> {
        debug!("Executing lighting pass");
        
        let output_view = self.output_texture.create_view(&wgpu::TextureViewDescriptor::default());
        
        let mut render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
            label: Some("Lighting Pass"),
            color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                view: &output_view,
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
        
        render_pass.set_pipeline(&self.pipeline);
        render_pass.set_bind_group(0, &self.bind_group, &[]);
        render_pass.draw(0..3, 0..1); // Fullscreen triangle
        
        drop(render_pass);
        
        debug!("Lighting pass completed");
        Ok(())
    }
    
    /// Get reference to output texture for binding to next pass
    ///
    /// # Returns
    /// Reference to lit scene texture
    pub fn output_texture(&self) -> &wgpu::Texture {
        &self.output_texture
    }
    
    /// Get output texture view for binding to next pass
    pub fn output_view(&self) -> wgpu::TextureView {
        self.output_texture.create_view(&wgpu::TextureViewDescriptor::default())
    }
}
