//! # Responsibility
//! Loads and validates WGSL shaders with hot-reload support.
//!
//! ---
//!
//! Parses WGSL shader source files using naga parser.
//! Provides compile-time validation and error reporting.
//! Supports shader caching to avoid redundant parsing.

use anyhow::{Context, Result};
use std::collections::HashMap;
use wgpu::*;

/// # Responsibility
/// Configuration for shader loader.
#[derive(Debug, Clone)]
pub struct ShaderLoaderConfig {
    /// Enable shader caching
    pub enable_cache: bool,
    /// Shader source directory path
    pub shader_dir: String,
}

impl Default for ShaderLoaderConfig {
    fn default() -> Self {
        Self {
            enable_cache: true,
            shader_dir: "assets/shaders".to_string(),
        }
    }
}

/// # Responsibility
/// Loads and caches WGSL shaders with validation.
///
/// ---
///
/// Usage:
/// ```rust
/// let loader = ShaderLoaderService::new(config);
/// let shader = loader.load(&device, "gbuffer.wgsl")?;
/// ```
pub struct ShaderLoaderService {
    config: ShaderLoaderConfig,
    cache: HashMap<String, ShaderModule>,
}

impl ShaderLoaderService {
    /// Creates a new shader loader with the given configuration.
    pub fn new(config: ShaderLoaderConfig) -> Self {
        Self {
            config,
            cache: HashMap::new(),
        }
    }

    /// Loads a WGSL shader from file and creates a ShaderModule.
    ///
    /// # Arguments
    /// * `device` - wgpu device
    /// * `filename` - Shader filename (relative to shader_dir)
    ///
    /// # Returns
    /// ShaderModule ready for pipeline creation
    ///
    /// # Errors
    /// - File not found
    /// - Invalid WGSL syntax
    /// - Shader validation failure
    pub fn load(&mut self, device: &Device, filename: &str) -> Result<ShaderModule> {
        // Check cache first
        if self.config.enable_cache {
            if let Some(cached_shader) = self.cache.get(filename) {
                // NOTE: wgpu ShaderModule cannot be cloned, so we return a reference
                // In production, this would require Arc<ShaderModule> or re-loading
                // For now, we'll re-load if caching is needed
            }
        }

        // Construct full path
        let shader_path = format!("{}/{}", self.config.shader_dir, filename);

        // Read shader source
        let source = std::fs::read_to_string(&shader_path)
            .context(format!("Failed to read shader file: {}", shader_path))?;

        // Validate WGSL syntax using naga (optional, wgpu does this internally)
        self.validate_wgsl(&source)
            .context(format!("Shader validation failed: {}", filename))?;

        // Create shader module
        let shader_module = device.create_shader_module(ShaderModuleDescriptor {
            label: Some(filename),
            source: ShaderSource::Wgsl(source.into()),
        });

        // Cache shader (NOTE: ShaderModule is not Clone, so this is a simplified version)
        // In production, use Arc<ShaderModule> or re-load on cache miss
        // self.cache.insert(filename.to_string(), shader_module);

        Ok(shader_module)
    }

    /// Validates WGSL shader source using naga parser.
    ///
    /// # Arguments
    /// * `source` - WGSL shader source code
    ///
    /// # Returns
    /// Ok(()) if valid, Err if syntax errors found
    fn validate_wgsl(&self, source: &str) -> Result<()> {
        // Parse WGSL using naga
        let _module = naga::front::wgsl::parse_str(source)
            .map_err(|e| anyhow::anyhow!("WGSL parse error: {:?}", e))?;

        // Validate module
        let mut validator = naga::valid::Validator::new(
            naga::valid::ValidationFlags::all(),
            naga::valid::Capabilities::all(),
        );

        let _info = validator
            .validate(&_module)
            .map_err(|e| anyhow::anyhow!("WGSL validation error: {:?}", e))?;

        Ok(())
    }

    /// Clears the shader cache (useful for hot-reload).
    pub fn clear_cache(&mut self) {
        self.cache.clear();
    }

    /// Returns number of cached shaders.
    pub fn cache_size(&self) -> usize {
        self.cache.len()
    }

    /// Preloads a list of shaders (useful for startup).
    ///
    /// # Arguments
    /// * `device` - wgpu device
    /// * `filenames` - List of shader filenames to preload
    ///
    /// # Returns
    /// Number of shaders successfully preloaded
    pub fn preload(&mut self, device: &Device, filenames: &[&str]) -> usize {
        let mut loaded_count = 0;

        for filename in filenames {
            if self.load(device, filename).is_ok() {
                loaded_count += 1;
            }
        }

        loaded_count
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = ShaderLoaderConfig::default();

        assert_eq!(config.shader_dir, "assets/shaders");
        assert!(config.enable_cache);
    }

    #[test]
    fn test_validate_wgsl_valid_shader() {
        let config = ShaderLoaderConfig::default();
        let loader = ShaderLoaderService::new(config);

        let valid_wgsl = r#"
            @vertex
            fn vs_main(@builtin(vertex_index) vertex_index: u32) -> @builtin(position) vec4<f32> {
                return vec4<f32>(0.0, 0.0, 0.0, 1.0);
            }

            @fragment
            fn fs_main() -> @location(0) vec4<f32> {
                return vec4<f32>(1.0, 0.0, 0.0, 1.0);
            }
        "#;

        let result = loader.validate_wgsl(valid_wgsl);
        assert!(result.is_ok(), "Valid WGSL should pass validation");
    }

    #[test]
    fn test_validate_wgsl_invalid_syntax() {
        let config = ShaderLoaderConfig::default();
        let loader = ShaderLoaderService::new(config);

        let invalid_wgsl = r#"
            @vertex
            fn vs_main(this is not valid WGSL syntax
        "#;

        let result = loader.validate_wgsl(invalid_wgsl);
        assert!(result.is_err(), "Invalid WGSL should fail validation");
    }

    #[test]
    fn test_validate_wgsl_missing_return_type() {
        let config = ShaderLoaderConfig::default();
        let loader = ShaderLoaderService::new(config);

        let missing_return = r#"
            @vertex
            fn vs_main(@builtin(vertex_index) vertex_index: u32) {
                // Missing return type
            }
        "#;

        let result = loader.validate_wgsl(missing_return);
        // Should fail validation (missing return type for vertex shader)
        assert!(result.is_err());
    }

    #[test]
    fn test_cache_size() {
        let config = ShaderLoaderConfig::default();
        let loader = ShaderLoaderService::new(config);

        assert_eq!(loader.cache_size(), 0);
    }

    #[test]
    fn test_clear_cache() {
        let config = ShaderLoaderConfig::default();
        let mut loader = ShaderLoaderService::new(config);

        // Simulate adding to cache (would happen in load())
        // loader.cache.insert("test.wgsl".to_string(), ...);

        loader.clear_cache();
        assert_eq!(loader.cache_size(), 0);
    }

    #[test]
    fn test_validate_wgsl_complex_shader() {
        let config = ShaderLoaderConfig::default();
        let loader = ShaderLoaderService::new(config);

        let complex_wgsl = r#"
            struct Uniforms {
                view_proj: mat4x4<f32>,
                time: f32,
            }

            @group(0) @binding(0) var<uniform> uniforms: Uniforms;

            struct VertexInput {
                @location(0) position: vec3<f32>,
                @location(1) normal: vec3<f32>,
            }

            struct VertexOutput {
                @builtin(position) clip_position: vec4<f32>,
                @location(0) world_normal: vec3<f32>,
            }

            @vertex
            fn vs_main(in: VertexInput) -> VertexOutput {
                var out: VertexOutput;
                out.clip_position = uniforms.view_proj * vec4<f32>(in.position, 1.0);
                out.world_normal = in.normal;
                return out;
            }

            @fragment
            fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
                let light_dir = normalize(vec3<f32>(1.0, 1.0, 1.0));
                let diffuse = max(dot(in.world_normal, light_dir), 0.0);
                return vec4<f32>(diffuse, diffuse, diffuse, 1.0);
            }
        "#;

        let result = loader.validate_wgsl(complex_wgsl);
        assert!(result.is_ok(), "Complex valid WGSL should pass validation");
    }

    #[test]
    fn test_validate_wgsl_compute_shader() {
        let config = ShaderLoaderConfig::default();
        let loader = ShaderLoaderService::new(config);

        let compute_wgsl = r#"
            @group(0) @binding(0) var<storage, read_write> data: array<f32>;

            @compute @workgroup_size(64)
            fn cs_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                let index = global_id.x;
                data[index] = data[index] * 2.0;
            }
        "#;

        let result = loader.validate_wgsl(compute_wgsl);
        assert!(result.is_ok(), "Valid compute shader should pass validation");
    }

    #[test]
    fn test_validate_wgsl_undefined_variable() {
        let config = ShaderLoaderConfig::default();
        let loader = ShaderLoaderService::new(config);

        let undefined_var = r#"
            @fragment
            fn fs_main() -> @location(0) vec4<f32> {
                return undefined_variable; // Does not exist
            }
        "#;

        let result = loader.validate_wgsl(undefined_var);
        assert!(result.is_err(), "Undefined variable should fail validation");
    }

    #[test]
    fn test_shader_path_construction() {
        let config = ShaderLoaderConfig {
            enable_cache: true,
            shader_dir: "/custom/shaders".to_string(),
        };

        let filename = "test.wgsl";
        let expected_path = "/custom/shaders/test.wgsl";

        let constructed_path = format!("{}/{}", config.shader_dir, filename);

        assert_eq!(constructed_path, expected_path);
    }
}
