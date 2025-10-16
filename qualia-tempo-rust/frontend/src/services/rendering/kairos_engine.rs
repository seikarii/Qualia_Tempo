//! # Responsibility
//! Main rendering engine orchestrator using wgpu for GPU-accelerated graphics.
//!
//! ---
//!
//! This is the central rendering engine for Qualia Tempo, implementing deferred rendering
//! pipeline with G-Buffer, lighting, and post-processing passes.

use wgpu;
use std::sync::Arc;
use crate::services::core::ILogger;

/// # Responsibility
/// Configuration for the Kairos Visual Engine.
#[derive(Debug, Clone)]
pub struct KairosEngineConfig {
    /// Target resolution width
    pub width: u32,
    
    /// Target resolution height
    pub height: u32,
    
    /// VSync enabled
    pub vsync: bool,
    
    /// MSAA sample count (1, 2, 4, 8)
    pub msaa_samples: u32,
    
    /// Enable HDR rendering
    pub hdr_enabled: bool,
}

impl Default for KairosEngineConfig {
    fn default() -> Self {
        Self {
            width: 1920,
            height: 1080,
            vsync: true,
            msaa_samples: 4,
            hdr_enabled: true,
        }
    }
}

/// # Responsibility
/// Main rendering engine managing the wgpu device, queue, and rendering pipeline.
pub struct KairosVisualEngine {
    config: KairosEngineConfig,
    logger: Arc<dyn ILogger>,
    
    // wgpu core objects
    instance: wgpu::Instance,
    adapter: Option<wgpu::Adapter>,
    device: Option<wgpu::Device>,
    queue: Option<wgpu::Queue>,
    surface: Option<wgpu::Surface<'static>>,
    surface_config: Option<wgpu::SurfaceConfiguration>,
}

impl KairosVisualEngine {
    /// # Responsibility
    /// Creates a new uninitialized rendering engine.
    pub fn new(config: KairosEngineConfig, logger: Arc<dyn ILogger>) -> Self {
        let instance = wgpu::Instance::new(wgpu::InstanceDescriptor {
            backends: wgpu::Backends::all(),
            ..Default::default()
        });
        
        Self {
            config,
            logger,
            instance,
            adapter: None,
            device: None,
            queue: None,
            surface: None,
            surface_config: None,
        }
    }
    
    /// # Responsibility
    /// Initializes the wgpu device and surface.
    ///
    /// ---
    ///
    /// CRITICAL: Must be called from a browser context with a valid canvas element.
    pub async fn initialize(&mut self, canvas: web_sys::HtmlCanvasElement) -> Result<(), String> {
        self.logger.info("Initializing Kairos Visual Engine...");
        
        // Create surface from canvas
        let surface = self.create_surface_from_canvas(&canvas)?;
        
        // Request adapter
        let adapter = self.instance
            .request_adapter(&wgpu::RequestAdapterOptions {
                power_preference: wgpu::PowerPreference::HighPerformance,
                compatible_surface: Some(&surface),
                force_fallback_adapter: false,
            })
            .await
            .ok_or_else(|| "Failed to find suitable GPU adapter".to_string())?;
        
        self.logger.info(&format!("GPU Adapter: {:?}", adapter.get_info()));
        
        // Request device and queue
        let (device, queue) = adapter
            .request_device(
                &wgpu::DeviceDescriptor {
                    label: Some("Qualia Tempo Device"),
                    required_features: wgpu::Features::empty(),
                    required_limits: wgpu::Limits::default(),
                    memory_hints: wgpu::MemoryHints::default(),
                },
                None,
            )
            .await
            .map_err(|e| format!("Failed to create device: {:?}", e))?;
        
        // Configure surface
        let surface_caps = surface.get_capabilities(&adapter);
        let surface_format = surface_caps.formats.iter()
            .find(|f| f.is_srgb())
            .copied()
            .unwrap_or(surface_caps.formats[0]);
        
        let surface_config = wgpu::SurfaceConfiguration {
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT,
            format: surface_format,
            width: self.config.width,
            height: self.config.height,
            present_mode: if self.config.vsync {
                wgpu::PresentMode::AutoVsync
            } else {
                wgpu::PresentMode::AutoNoVsync
            },
            alpha_mode: surface_caps.alpha_modes[0],
            view_formats: vec![],
            desired_maximum_frame_latency: 2,
        };
        
        surface.configure(&device, &surface_config);
        
        self.adapter = Some(adapter);
        self.device = Some(device);
        self.queue = Some(queue);
        self.surface = Some(surface);
        self.surface_config = Some(surface_config);
        
        self.logger.info(&format!(
            "Kairos Engine initialized: {}x{}, {:?}, MSAA: {}x",
            self.config.width, self.config.height, surface_format, self.config.msaa_samples
        ));
        
        Ok(())
    }
    
    /// # Responsibility
    /// Creates a wgpu surface from an HTML canvas element.
    fn create_surface_from_canvas(&self, canvas: &web_sys::HtmlCanvasElement) -> Result<wgpu::Surface<'static>, String> {
        // For WASM, wgpu 22 needs the SurfaceTarget::Canvas variant
        let surface_target = wgpu::SurfaceTarget::Canvas(canvas.clone());
        let surface = self.instance
            .create_surface(surface_target)
            .map_err(|e| format!("Failed to create surface: {:?}", e))?;
        
        Ok(surface)
    }
    
    /// # Responsibility
    /// Renders a single frame.
    ///
    /// ---
    ///
    /// Placeholder implementation - full rendering pipeline to be added in subsequent phases.
    pub fn render(&mut self) -> Result<(), String> {
        let surface = self.surface.as_ref().ok_or("Surface not initialized")?;
        let device = self.device.as_ref().ok_or("Device not initialized")?;
        let queue = self.queue.as_ref().ok_or("Queue not initialized")?;
        
        // Get current surface texture
        let output = surface
            .get_current_texture()
            .map_err(|e| format!("Failed to acquire next swap chain texture: {:?}", e))?;
        
        let view = output.texture.create_view(&wgpu::TextureViewDescriptor::default());
        
        // Create command encoder
        let mut encoder = device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
            label: Some("Render Encoder"),
        });
        
        // Clear screen (placeholder - will be replaced with full pipeline)
        {
            let _render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("Clear Pass"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: &view,
                    resolve_target: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(wgpu::Color {
                            r: 0.01,
                            g: 0.01,
                            b: 0.01,
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
        
        // Submit commands
        queue.submit(std::iter::once(encoder.finish()));
        output.present();
        
        Ok(())
    }
    
    /// # Responsibility
    /// Resizes the rendering surface.
    pub fn resize(&mut self, width: u32, height: u32) {
        self.config.width = width;
        self.config.height = height;
        
        if let (Some(surface), Some(device), Some(ref mut surface_config)) = 
            (self.surface.as_ref(), self.device.as_ref(), self.surface_config.as_mut()) {
            surface_config.width = width;
            surface_config.height = height;
            surface.configure(device, surface_config);
            
            self.logger.info(&format!("Resized render surface: {}x{}", width, height));
        }
    }
    
    /// # Responsibility
    /// Gets reference to the wgpu device.
    pub fn device(&self) -> Option<&wgpu::Device> {
        self.device.as_ref()
    }
    
    /// # Responsibility
    /// Gets reference to the wgpu queue.
    pub fn queue(&self) -> Option<&wgpu::Queue> {
        self.queue.as_ref()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::core::MockLogger;
    
    #[test]
    fn test_kairos_config_defaults() {
        let config = KairosEngineConfig::default();
        assert_eq!(config.width, 1920);
        assert_eq!(config.height, 1080);
        assert!(config.vsync);
        assert_eq!(config.msaa_samples, 4);
        assert!(config.hdr_enabled);
    }
    
    #[test]
    fn test_kairos_engine_creation() {
        let config = KairosEngineConfig::default();
        let logger = Arc::new(MockLogger::new());
        
        let engine = KairosVisualEngine::new(config, logger);
        
        assert!(engine.adapter.is_none());
        assert!(engine.device.is_none());
        assert!(engine.queue.is_none());
        assert!(engine.surface.is_none());
    }
}
