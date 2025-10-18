//! # Responsibility
//! Implements composite pass with TAA and tonemapping.
//!
//! ---
//!
//! Fourth and final rendering pass: combines all post-processing effects,
//! applies temporal anti-aliasing (TAA) and tonemapping for final output.
//! Follows VISUALS.RUST.md §2 specification.

use wgpu;
use anyhow::Result;
use tracing::{info, debug};

/// # Responsibility
/// Manages final composite pass with TAA and tonemapping.
///
/// ---
///
/// Final step in deferred pipeline:
/// 1. Temporal Anti-Aliasing (TAA) using previous frame + velocity buffer
/// 2. Tonemapping (HDR → LDR conversion)
/// 3. Gamma correction for final display
pub struct CompositePass {
    pipeline: wgpu::RenderPipeline,
    bind_group: wgpu::BindGroup,
    _bind_group_layout: wgpu::BindGroupLayout,
    history_texture: wgpu::Texture,
    _sampler: wgpu::Sampler,
}

impl CompositePass {
    /// Create new composite pass
    ///
    /// # Arguments
    /// - `device`: wgpu device for resource creation
    /// - `postprocess_texture_view`: Post-processed scene texture
    /// - `velocity_texture_view`: Velocity buffer for TAA
    /// - `config`: Surface configuration for texture sizing
    ///
    /// # Returns
    /// Initialized composite pass with TAA and tonemapping
    pub fn new(
        device: &wgpu::Device,
        postprocess_texture_view: &wgpu::TextureView,
        velocity_texture_view: &wgpu::TextureView,
        config: &wgpu::SurfaceConfiguration,
    ) -> Result<Self> {
        info!("Initializing composite pass (TAA + tonemapping)");
        
        // Create sampler for input textures
        let sampler = device.create_sampler(&wgpu::SamplerDescriptor {
            label: Some("Composite Sampler"),
            address_mode_u: wgpu::AddressMode::ClampToEdge,
            address_mode_v: wgpu::AddressMode::ClampToEdge,
            address_mode_w: wgpu::AddressMode::ClampToEdge,
            mag_filter: wgpu::FilterMode::Linear,
            min_filter: wgpu::FilterMode::Linear,
            mipmap_filter: wgpu::FilterMode::Nearest,
            ..Default::default()
        });
        
        // Create history texture for TAA (stores previous frame)
        let history_texture = device.create_texture(&wgpu::TextureDescriptor {
            label: Some("TAA History Texture"),
            size: wgpu::Extent3d {
                width: config.width,
                height: config.height,
                depth_or_array_layers: 1,
            },
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: config.format, // Match swap chain format
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT | wgpu::TextureUsages::TEXTURE_BINDING,
            view_formats: &[],
        });
        
        // Create bind group layout
        let bind_group_layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("Composite Bind Group Layout"),
            entries: &[
                // Current frame texture
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
                // History texture (previous frame)
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
                // Velocity texture
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
        
        let history_view = history_texture.create_view(&Default::default());
        
        // Create bind group
        let bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("Composite Bind Group"),
            layout: &bind_group_layout,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: wgpu::BindingResource::TextureView(postprocess_texture_view),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: wgpu::BindingResource::TextureView(&history_view),
                },
                wgpu::BindGroupEntry {
                    binding: 2,
                    resource: wgpu::BindingResource::TextureView(velocity_texture_view),
                },
                wgpu::BindGroupEntry {
                    binding: 3,
                    resource: wgpu::BindingResource::Sampler(&sampler),
                },
            ],
        });
        
        // Create pipeline
        let pipeline = Self::create_pipeline(device, &bind_group_layout, config.format)?;
        
        debug!("Composite pass initialized successfully");
        
        Ok(Self {
            pipeline,
            bind_group,
            _bind_group_layout: bind_group_layout,
            history_texture,
            _sampler: sampler,
        })
    }
    
    /// Create composite pipeline (TAA + tonemapping)
    fn create_pipeline(
        device: &wgpu::Device,
        bind_group_layout: &wgpu::BindGroupLayout,
        output_format: wgpu::TextureFormat,
    ) -> Result<wgpu::RenderPipeline> {
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Composite Shader"),
            source: wgpu::ShaderSource::Wgsl(include_str!("../shaders/composite.wgsl").into()),
        });
        
        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Composite Pipeline Layout"),
            bind_group_layouts: &[bind_group_layout],
            push_constant_ranges: &[],
        });
        
        Ok(device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("Composite Pipeline"),
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
                    format: output_format,
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
    
    /// Execute composite pass (TAA + tonemapping)
    ///
    /// # Arguments
    /// - `encoder`: Command encoder for recording GPU commands
    /// - `output_view`: Final output texture view (swap chain)
    ///
    /// # Returns
    /// Success or error
    pub fn render(
        &self,
        encoder: &mut wgpu::CommandEncoder,
        output_view: &wgpu::TextureView,
    ) -> Result<()> {
        debug!("Executing composite pass (TAA + tonemapping)");
        
        let mut render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
            label: Some("Composite Pass"),
            color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                view: output_view,
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
        
        Ok(())
    }
    
    /// Get reference to history texture for manual updates
    ///
    /// # Returns
    /// Reference to TAA history texture
    pub fn history_texture(&self) -> &wgpu::Texture {
        &self.history_texture
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_composite_pass_struct_compiles() {
        // Structural test - full wgpu initialization requires device
        // Integration testing in WASM environment
    }
}
