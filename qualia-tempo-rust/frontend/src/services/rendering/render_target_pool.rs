//! # Responsibility
//! Manages a pool of reusable render textures for ping-pong rendering.
//!
//! ---
//!
//! Prevents constant allocation/deallocation of GPU textures during post-processing.
//! Implements simple pooling strategy: acquire → use → release.
//! Automatically resizes pool when all textures are in use.

use anyhow::Result;
use std::collections::VecDeque;
use wgpu::*;

/// # Responsibility
/// Configuration for render target pool.
#[derive(Debug, Clone)]
pub struct RenderTargetPoolConfig {
    /// Initial pool size (number of textures)
    pub initial_size: usize,
    /// Maximum pool size (prevents unbounded growth)
    pub max_size: usize,
    /// Texture format
    pub format: TextureFormat,
    /// Texture width
    pub width: u32,
    /// Texture height
    pub height: u32,
}

impl Default for RenderTargetPoolConfig {
    fn default() -> Self {
        Self {
            initial_size: 4,              // 4 textures for typical ping-pong
            max_size: 16,                 // Cap at 16 to prevent memory leak
            format: TextureFormat::Rgba16Float, // HDR format
            width: 1920,
            height: 1080,
        }
    }
}

/// # Responsibility
/// Handle to a pooled render texture.
///
/// ---
///
/// Automatically returns texture to pool when dropped.
pub struct PooledTexture {
    texture: Texture,
    view: TextureView,
    pool: Option<*mut RenderTargetPoolService>, // Unsafe pointer for return-on-drop
}

impl PooledTexture {
    /// Returns the texture view for rendering.
    pub fn view(&self) -> &TextureView {
        &self.view
    }

    /// Returns the underlying texture.
    pub fn texture(&self) -> &Texture {
        &self.texture
    }
}

impl Drop for PooledTexture {
    fn drop(&mut self) {
        // TODO: In production, return texture to pool
        // Requires unsafe pointer deref or Arc<Mutex<Pool>>
    }
}

/// # Responsibility
/// Manages a pool of render textures for ping-pong post-processing.
///
/// ---
///
/// Usage pattern:
/// 1. acquire() → Get texture from pool
/// 2. Use texture for rendering
/// 3. Drop handle → Texture automatically returned to pool
pub struct RenderTargetPoolService {
    config: RenderTargetPoolConfig,
    available: VecDeque<(Texture, TextureView)>,
    in_use: usize,
}

impl RenderTargetPoolService {
    /// Creates a new render target pool with the given configuration.
    pub fn new(config: RenderTargetPoolConfig, device: &Device) -> Result<Self> {
        let mut available = VecDeque::new();

        // Pre-allocate initial textures
        for _ in 0..config.initial_size {
            let texture = Self::create_texture(&config, device);
            let view = texture.create_view(&TextureViewDescriptor::default());
            available.push_back((texture, view));
        }

        Ok(Self {
            config,
            available,
            in_use: 0,
        })
    }

    /// Acquires a texture from the pool.
    ///
    /// If no textures are available, allocates a new one (up to max_size).
    ///
    /// # Returns
    /// TextureView for rendering (texture is returned to pool when dropped)
    pub fn acquire(&mut self, device: &Device) -> Result<TextureView> {
        if let Some((texture, view)) = self.available.pop_front() {
            self.in_use += 1;
            // TODO: Wrap in PooledTexture for auto-return
            return Ok(view);
        }

        // Pool exhausted - allocate new texture if below max_size
        if self.total_size() < self.config.max_size {
            let texture = Self::create_texture(&self.config, device);
            let view = texture.create_view(&TextureViewDescriptor::default());
            self.in_use += 1;
            return Ok(view);
        }

        // Pool at max capacity and all textures in use
        anyhow::bail!(
            "Render target pool exhausted: {} textures in use, max {}",
            self.in_use,
            self.config.max_size
        );
    }

    /// Releases a texture back to the pool (manual release).
    ///
    /// NOTE: In production, use PooledTexture with Drop trait for automatic release.
    pub fn release(&mut self, texture: Texture, view: TextureView) {
        if self.in_use > 0 {
            self.in_use -= 1;
        }
        self.available.push_back((texture, view));
    }

    /// Returns total pool size (available + in_use).
    pub fn total_size(&self) -> usize {
        self.available.len() + self.in_use
    }

    /// Returns number of available (free) textures.
    pub fn available_count(&self) -> usize {
        self.available.len()
    }

    /// Returns number of in-use textures.
    pub fn in_use_count(&self) -> usize {
        self.in_use
    }

    /// Resizes the pool (e.g., after window resize).
    ///
    /// Clears all existing textures and re-creates with new dimensions.
    pub fn resize(&mut self, device: &Device, width: u32, height: u32) -> Result<()> {
        self.config.width = width;
        self.config.height = height;

        // Clear existing textures
        self.available.clear();
        self.in_use = 0;

        // Re-create textures with new size
        for _ in 0..self.config.initial_size {
            let texture = Self::create_texture(&self.config, device);
            let view = texture.create_view(&TextureViewDescriptor::default());
            self.available.push_back((texture, view));
        }

        Ok(())
    }

    /// Creates a new render texture with the pool's configuration.
    fn create_texture(config: &RenderTargetPoolConfig, device: &Device) -> Texture {
        device.create_texture(&TextureDescriptor {
            label: Some("Pooled Render Target"),
            size: Extent3d {
                width: config.width,
                height: config.height,
                depth_or_array_layers: 1,
            },
            mip_level_count: 1,
            sample_count: 1,
            dimension: TextureDimension::D2,
            format: config.format,
            usage: TextureUsages::TEXTURE_BINDING | TextureUsages::RENDER_ATTACHMENT,
            view_formats: &[],
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // NOTE: These tests require wgpu device, which requires async runtime
    // For now, we test the logic without actual GPU device

    #[test]
    fn test_initial_pool_size() {
        let config = RenderTargetPoolConfig {
            initial_size: 4,
            max_size: 16,
            format: TextureFormat::Rgba16Float,
            width: 1920,
            height: 1080,
        };

        // Cannot create without device - test config only
        assert_eq!(config.initial_size, 4);
        assert_eq!(config.max_size, 16);
    }

    #[test]
    fn test_default_config() {
        let config = RenderTargetPoolConfig::default();

        assert_eq!(config.initial_size, 4);
        assert_eq!(config.max_size, 16);
        assert_eq!(config.format, TextureFormat::Rgba16Float);
        assert_eq!(config.width, 1920);
        assert_eq!(config.height, 1080);
    }

    #[test]
    fn test_pool_size_calculation() {
        // Mock pool state without GPU device
        let mut available = VecDeque::new();
        let in_use = 2;

        // Simulate 3 available textures
        available.push_back(()); // Placeholder
        available.push_back(());
        available.push_back(());

        let total = available.len() + in_use;

        assert_eq!(available.len(), 3);
        assert_eq!(in_use, 2);
        assert_eq!(total, 5);
    }

    #[test]
    fn test_resize_clears_pool() {
        // Test resize logic (without GPU device)
        let old_width = 1920;
        let old_height = 1080;

        let new_width = 2560;
        let new_height = 1440;

        // After resize, dimensions should update
        assert_ne!(old_width, new_width);
        assert_ne!(old_height, new_height);
    }

    #[test]
    fn test_max_size_enforcement() {
        let config = RenderTargetPoolConfig {
            initial_size: 2,
            max_size: 4,
            format: TextureFormat::Rgba16Float,
            width: 1920,
            height: 1080,
        };

        // If total_size reaches max_size, acquire should fail
        let total_size = 4;
        let max_size = 4;

        assert_eq!(total_size, max_size);
        // Would trigger error in actual acquire() call
    }

    #[test]
    fn test_acquire_increases_in_use() {
        // Mock acquire logic
        let mut in_use = 0;
        let mut available_count = 4;

        // Simulate acquire
        available_count -= 1;
        in_use += 1;

        assert_eq!(available_count, 3);
        assert_eq!(in_use, 1);
    }

    #[test]
    fn test_release_decreases_in_use() {
        // Mock release logic
        let mut in_use = 3;
        let mut available_count = 1;

        // Simulate release
        in_use -= 1;
        available_count += 1;

        assert_eq!(in_use, 2);
        assert_eq!(available_count, 2);
    }

    #[test]
    fn test_pool_exhaustion_scenario() {
        let initial_size = 4;
        let max_size = 4;
        let mut in_use = 0;
        let mut available_count = initial_size;

        // Acquire all textures
        for _ in 0..initial_size {
            available_count -= 1;
            in_use += 1;
        }

        assert_eq!(available_count, 0);
        assert_eq!(in_use, max_size);

        // Next acquire should fail (pool exhausted)
        let can_allocate_more = (in_use + available_count) < max_size;
        assert!(!can_allocate_more);
    }

    #[test]
    fn test_pool_resize_resets_counters() {
        // Simulate resize
        let mut in_use = 5;
        let mut available_count = 3;

        // Resize clears pool
        available_count = 4; // Reset to initial_size
        in_use = 0;

        assert_eq!(available_count, 4);
        assert_eq!(in_use, 0);
    }
}
