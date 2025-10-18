//! # Responsibility
//! Implements the G-Buffer pass for deferred rendering pipeline.
//!
//! ---
//!
//! First rendering pass: renders scene geometry into multiple render targets
//! (position, normal, albedo, depth). Follows VISUALS.RUST.md §2 specification
//! for deferred rendering architecture.

use wgpu;
use anyhow::Result;
use tracing::{info, debug};

/// # Responsibility
/// Manages G-Buffer textures and render pipeline for geometry pass.
///
/// ---
///
/// Creates 4 texture targets:
/// - `g_position`: World-space positions (RGBA16Float)
/// - `g_normal`: World-space normals (RGBA16Float)
/// - `g_albedo`: Base color + opacity (RGBA16Float)
/// - `g_depth`: Depth buffer (Depth32Float)
pub struct GBufferPass {
    pub position_texture: wgpu::Texture,
    pub normal_texture: wgpu::Texture,
    pub albedo_texture: wgpu::Texture,
    pub depth_texture: wgpu::Texture,
    pipeline: wgpu::RenderPipeline,
    _bind_group_layout: wgpu::BindGroupLayout,
}

impl GBufferPass {
    /// Create new G-Buffer pass
    ///
    /// # Arguments
    /// - `device`: wgpu device for resource creation
    /// - `config`: Surface configuration for texture sizing
    ///
    /// # Returns
    /// Initialized G-Buffer pass with all textures and pipeline
    pub fn new(device: &wgpu::Device, config: &wgpu::SurfaceConfiguration) -> Result<Self> {
        info!("Initializing G-Buffer pass ({}x{})", config.width, config.height);
        
        // Create G-Buffer textures (position, normal, albedo)
        let texture_desc = wgpu::TextureDescriptor {
            label: Some("G-Buffer Texture"),
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
        };
        
        let position_texture = device.create_texture(&texture_desc);
        let normal_texture = device.create_texture(&texture_desc);
        let albedo_texture = device.create_texture(&texture_desc);
        
        // Create depth texture
        let depth_texture = device.create_texture(&wgpu::TextureDescriptor {
            label: Some("G-Buffer Depth Texture"),
            format: wgpu::TextureFormat::Depth32Float,
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT | wgpu::TextureUsages::TEXTURE_BINDING,
            ..texture_desc
        });
        
        // Create bind group layout
        let bind_group_layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("G-Buffer Bind Group Layout"),
            entries: &[],
        });
        
        // Create render pipeline
        let pipeline = Self::create_pipeline(device, &bind_group_layout)?;
        
        debug!("G-Buffer pass initialized successfully");
        
        Ok(Self {
            position_texture,
            normal_texture,
            albedo_texture,
            depth_texture,
            pipeline,
            _bind_group_layout: bind_group_layout,
        })
    }
    
    /// Create G-Buffer render pipeline
    fn create_pipeline(
        device: &wgpu::Device,
        bind_group_layout: &wgpu::BindGroupLayout,
    ) -> Result<wgpu::RenderPipeline> {
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("G-Buffer Shader"),
            source: wgpu::ShaderSource::Wgsl(include_str!("../shaders/gbuffer.wgsl").into()),
        });
        
        let layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("G-Buffer Pipeline Layout"),
            bind_group_layouts: &[bind_group_layout],
            push_constant_ranges: &[],
        });
        
        let pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("G-Buffer Pipeline"),
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
                targets: &[
                    Some(wgpu::ColorTargetState {
                        format: wgpu::TextureFormat::Rgba16Float,
                        blend: None,
                        write_mask: wgpu::ColorWrites::ALL,
                    }),
                    Some(wgpu::ColorTargetState {
                        format: wgpu::TextureFormat::Rgba16Float,
                        blend: None,
                        write_mask: wgpu::ColorWrites::ALL,
                    }),
                    Some(wgpu::ColorTargetState {
                        format: wgpu::TextureFormat::Rgba16Float,
                        blend: None,
                        write_mask: wgpu::ColorWrites::ALL,
                    }),
                ],
                compilation_options: Default::default(),
            }),
            primitive: wgpu::PrimitiveState {
                topology: wgpu::PrimitiveTopology::TriangleList,
                strip_index_format: None,
                front_face: wgpu::FrontFace::Ccw,
                cull_mode: Some(wgpu::Face::Back),
                unclipped_depth: false,
                polygon_mode: wgpu::PolygonMode::Fill,
                conservative: false,
            },
            depth_stencil: Some(wgpu::DepthStencilState {
                format: wgpu::TextureFormat::Depth32Float,
                depth_write_enabled: true,
                depth_compare: wgpu::CompareFunction::Less,
                stencil: wgpu::StencilState::default(),
                bias: wgpu::DepthBiasState::default(),
            }),
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
    
    /// Execute G-Buffer render pass
    ///
    /// # Arguments
    /// - `encoder`: Command encoder for recording draw commands
    ///
    /// # Returns
    /// Result indicating success or failure
    pub fn render(&self, encoder: &mut wgpu::CommandEncoder) -> Result<()> {
        debug!("Executing G-Buffer pass");
        
        let position_view = self.position_texture.create_view(&wgpu::TextureViewDescriptor::default());
        let normal_view = self.normal_texture.create_view(&wgpu::TextureViewDescriptor::default());
        let albedo_view = self.albedo_texture.create_view(&wgpu::TextureViewDescriptor::default());
        let depth_view = self.depth_texture.create_view(&wgpu::TextureViewDescriptor::default());
        
        let mut render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
            label: Some("G-Buffer Pass"),
            color_attachments: &[
                Some(wgpu::RenderPassColorAttachment {
                    view: &position_view,
                    resolve_target: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(wgpu::Color::BLACK),
                        store: wgpu::StoreOp::Store,
                    },
                }),
                Some(wgpu::RenderPassColorAttachment {
                    view: &normal_view,
                    resolve_target: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(wgpu::Color::BLACK),
                        store: wgpu::StoreOp::Store,
                    },
                }),
                Some(wgpu::RenderPassColorAttachment {
                    view: &albedo_view,
                    resolve_target: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(wgpu::Color::BLACK),
                        store: wgpu::StoreOp::Store,
                    },
                }),
            ],
            depth_stencil_attachment: Some(wgpu::RenderPassDepthStencilAttachment {
                view: &depth_view,
                depth_ops: Some(wgpu::Operations {
                    load: wgpu::LoadOp::Clear(1.0),
                    store: wgpu::StoreOp::Store,
                }),
                stencil_ops: None,
            }),
            timestamp_writes: None,
            occlusion_query_set: None,
        });
        
        render_pass.set_pipeline(&self.pipeline);
        
        // Phase 8: Geometry rendering placeholder
        // Full geometry will be rendered in subsequent phases
        // Currently establishes pipeline architecture
        
        drop(render_pass);
        
        debug!("G-Buffer pass completed");
        Ok(())
    }
    
    /// Get G-Buffer texture views for binding to next pass
    pub fn texture_views(&self) -> GBufferViews {
        GBufferViews {
            position: self.position_texture.create_view(&wgpu::TextureViewDescriptor::default()),
            normal: self.normal_texture.create_view(&wgpu::TextureViewDescriptor::default()),
            albedo: self.albedo_texture.create_view(&wgpu::TextureViewDescriptor::default()),
            depth: self.depth_texture.create_view(&wgpu::TextureViewDescriptor::default()),
        }
    }
}

/// # Responsibility
/// Holds texture views for G-Buffer outputs.
///
/// ---
///
/// Used to bind G-Buffer textures to subsequent rendering passes
/// (lighting, post-processing).
pub struct GBufferViews {
    pub position: wgpu::TextureView,
    pub normal: wgpu::TextureView,
    pub albedo: wgpu::TextureView,
    pub depth: wgpu::TextureView,
}
