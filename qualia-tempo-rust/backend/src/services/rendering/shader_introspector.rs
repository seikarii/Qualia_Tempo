//! # Responsibility
//! Provides shader metadata and basic validation for WGSL shaders.
//!
//! ---
//!
//! This service loads shader files from disk, validates basic WGSL syntax,
//! and provides metadata for frontend rendering. Phase 1 implementation
//! provides basic file I/O and validation. Phase 3 will add full naga-based
//! shader reflection and uniform extraction.

use tokio::fs;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use anyhow::{Result, Context, bail};
use shaku::{Component, Interface};
use serde::{Serialize, Deserialize};
use async_trait::async_trait;
use crate::services::interfaces::ILogger;

/// # Responsibility
/// Configuration for shader introspection service.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShaderIntrospectionConfig {
    /// Directory containing WGSL shader files
    pub shader_directory: String,
    
    /// Enable shader caching
    pub enable_caching: bool,
    
    /// Enable validation on load
    pub enable_validation: bool,
}

impl Default for ShaderIntrospectionConfig {
    fn default() -> Self {
        Self {
            shader_directory: "public/shaders".to_string(),
            enable_caching: true,
            enable_validation: true,
        }
    }
}

/// # Responsibility
/// Represents shader type classification.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ShaderType {
    Vertex,
    Fragment,
    Compute,
    Unknown,
}

/// # Responsibility
/// Metadata for a loaded shader file.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShaderMetadata {
    /// Shader file name (without path)
    pub name: String,
    
    /// Shader type (vertex, fragment, compute)
    pub shader_type: ShaderType,
    
    /// Shader source code
    pub source: String,
    
    /// File size in bytes
    pub size_bytes: u64,
    
    /// Whether validation passed
    pub is_valid: bool,
}

/// # Responsibility
/// Interface for shader introspection service.
#[async_trait]
pub trait IShaderIntrospectionService: Interface {
    /// Lists all available shader files
    fn list_shaders(&self) -> Result<Vec<String>>;
    
    /// Loads shader metadata by name
    async fn load_shader(&self, shader_name: &str) -> Result<ShaderMetadata>;
    
    /// Validates WGSL shader source
    fn validate_shader(&self, source: &str) -> bool;
}

/// # Responsibility
/// Provides shader metadata and basic validation for WGSL shaders.
///
/// ---
///
/// Phase 1: Basic file I/O and validation.
/// Phase 3: Full naga-based shader reflection and uniform extraction.
#[derive(Component)]
#[shaku(interface = IShaderIntrospectionService)]
pub struct ShaderIntrospectionService {
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,
    
    config: Arc<ShaderIntrospectionConfig>,
}

impl ShaderIntrospectionService {
    pub fn new(logger: Arc<dyn ILogger>, config: Arc<ShaderIntrospectionConfig>) -> Self {
        logger.info(&format!(
            "ShaderIntrospectionService initialized (directory: {})",
            config.shader_directory
        ));
        
        Self { logger, config }
    }
    
    /// Classifies shader type based on content analysis.
    fn classify_shader_type(source: &str) -> ShaderType {
        // Check for WGSL stage attributes
        if source.contains("@vertex") {
            ShaderType::Vertex
        } else if source.contains("@fragment") {
            ShaderType::Fragment
        } else if source.contains("@compute") {
            ShaderType::Compute
        } else {
            // Fallback: Check for function names
            if source.contains("fn vs_main") || source.contains("fn vertex_main") {
                ShaderType::Vertex
            } else if source.contains("fn fs_main") || source.contains("fn fragment_main") {
                ShaderType::Fragment
            } else if source.contains("fn cs_main") || source.contains("fn compute_main") {
                ShaderType::Compute
            } else {
                ShaderType::Unknown
            }
        }
    }
}

#[async_trait]
impl IShaderIntrospectionService for ShaderIntrospectionService {
    fn list_shaders(&self) -> Result<Vec<String>> {
        // Synchronous directory listing (TODO: make async in Phase 3)
        let shader_dir = Path::new(&self.config.shader_directory);
        
        if !shader_dir.exists() {
            self.logger.warn(&format!(
                "Shader directory does not exist: {}",
                self.config.shader_directory
            ));
            return Ok(Vec::new());
        }
        
        let entries = std::fs::read_dir(shader_dir)
            .context("Failed to read shader directory")?;
        
        let mut shader_files = Vec::new();
        for entry in entries {
            let entry = entry.context("Failed to read directory entry")?;
            let path = entry.path();
            
            if path.extension().and_then(|s| s.to_str()) == Some("wgsl") {
                if let Some(file_name) = path.file_name().and_then(|s| s.to_str()) {
                    shader_files.push(file_name.to_string());
                }
            }
        }
        
        Ok(shader_files)
    }
    
    async fn load_shader(&self, shader_name: &str) -> Result<ShaderMetadata> {
        let shader_path = PathBuf::from(&self.config.shader_directory).join(shader_name);
        
        // Validate path (prevent directory traversal)
        if shader_name.contains("..") || shader_name.contains('/') || shader_name.contains('\\') {
            bail!("Invalid shader name: {}", shader_name);
        }
        
        // Read shader source
        let source = fs::read_to_string(&shader_path)
            .await
            .context(format!("Failed to read shader: {}", shader_name))?;
        
        // Get file metadata
        let metadata = fs::metadata(&shader_path)
            .await
            .context("Failed to read shader metadata")?;
        
        let size_bytes = metadata.len();
        
        // Classify shader type
        let shader_type = Self::classify_shader_type(&source);
        
        // Validate if enabled
        let is_valid = if self.config.enable_validation {
            self.validate_shader(&source)
        } else {
            true
        };
        
        if !is_valid {
            self.logger.warn(&format!("Shader validation failed: {}", shader_name));
        }
        
        Ok(ShaderMetadata {
            name: shader_name.to_string(),
            shader_type,
            source,
            size_bytes,
            is_valid,
        })
    }
    
    fn validate_shader(&self, source: &str) -> bool {
        // Phase 1: Basic validation (checks for WGSL syntax markers)
        // Phase 3: Use naga for full validation
        
        // Must contain at least one function
        if !source.contains("fn ") {
            return false;
        }
        
        // Must have a stage attribute or recognized entry point
        let has_stage_attribute = source.contains("@vertex")
            || source.contains("@fragment")
            || source.contains("@compute");
        
        let has_entry_point = source.contains("fn vs_main")
            || source.contains("fn fs_main")
            || source.contains("fn cs_main")
            || source.contains("fn vertex_main")
            || source.contains("fn fragment_main")
            || source.contains("fn compute_main");
        
        has_stage_attribute || has_entry_point
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::infrastructure::QualiaLogger;
    use tokio::fs;
    use tempfile::TempDir;
    
    fn create_test_service(shader_dir: &str) -> ShaderIntrospectionService {
        let logger = Arc::new(QualiaLogger) as Arc<dyn ILogger>;
        let config = Arc::new(ShaderIntrospectionConfig {
            shader_directory: shader_dir.to_string(),
            enable_caching: false,
            enable_validation: true,
        });
        
        ShaderIntrospectionService::new(logger, config)
    }
    
    #[test]
    fn test_classify_shader_type_vertex() {
        let source = r#"
            @vertex
            fn vs_main() -> @builtin(position) vec4<f32> {
                return vec4<f32>(0.0, 0.0, 0.0, 1.0);
            }
        "#;
        
        let shader_type = ShaderIntrospectionService::classify_shader_type(source);
        assert_eq!(shader_type, ShaderType::Vertex);
    }
    
    #[test]
    fn test_classify_shader_type_fragment() {
        let source = r#"
            @fragment
            fn fs_main() -> @location(0) vec4<f32> {
                return vec4<f32>(1.0, 0.0, 0.0, 1.0);
            }
        "#;
        
        let shader_type = ShaderIntrospectionService::classify_shader_type(source);
        assert_eq!(shader_type, ShaderType::Fragment);
    }
    
    #[test]
    fn test_classify_shader_type_compute() {
        let source = r#"
            @compute @workgroup_size(8, 8, 1)
            fn cs_main() {
                // Compute shader logic
            }
        "#;
        
        let shader_type = ShaderIntrospectionService::classify_shader_type(source);
        assert_eq!(shader_type, ShaderType::Compute);
    }
    
    #[test]
    fn test_validate_shader_valid() {
        let service = create_test_service("/tmp");
        
        let valid_shader = r#"
            @vertex
            fn vs_main() -> @builtin(position) vec4<f32> {
                return vec4<f32>(0.0, 0.0, 0.0, 1.0);
            }
        "#;
        
        assert!(service.validate_shader(valid_shader));
    }
    
    #[test]
    fn test_validate_shader_invalid_no_function() {
        let service = create_test_service("/tmp");
        
        let invalid_shader = "// Just a comment";
        
        assert!(!service.validate_shader(invalid_shader));
    }
    
    #[test]
    fn test_validate_shader_invalid_no_entry_point() {
        let service = create_test_service("/tmp");
        
        let invalid_shader = r#"
            fn helper_function() {
                // No entry point
            }
        "#;
        
        assert!(!service.validate_shader(invalid_shader));
    }
    
    #[tokio::test]
    async fn test_load_shader_success() {
        // Create temporary directory with test shader
        let temp_dir = TempDir::new().unwrap();
        let shader_path = temp_dir.path().join("test.wgsl");
        
        let shader_content = r#"
            @vertex
            fn vs_main() -> @builtin(position) vec4<f32> {
                return vec4<f32>(0.0, 0.0, 0.0, 1.0);
            }
        "#;
        
        fs::write(&shader_path, shader_content).await.unwrap();
        
        let service = create_test_service(temp_dir.path().to_str().unwrap());
        
        let metadata = service.load_shader("test.wgsl").await.unwrap();
        
        assert_eq!(metadata.name, "test.wgsl");
        assert_eq!(metadata.shader_type, ShaderType::Vertex);
        assert!(metadata.is_valid);
        assert!(metadata.size_bytes > 0);
    }
    
    #[tokio::test]
    async fn test_load_shader_prevents_directory_traversal() {
        let service = create_test_service("/tmp");
        
        let result = service.load_shader("../etc/passwd").await;
        
        assert!(result.is_err(), "Should reject directory traversal attempts");
    }
    
    #[test]
    fn test_list_shaders_empty_directory() {
        let temp_dir = TempDir::new().unwrap();
        let service = create_test_service(temp_dir.path().to_str().unwrap());
        
        let shaders = service.list_shaders().unwrap();
        
        assert_eq!(shaders.len(), 0);
    }
    
    #[tokio::test]
    async fn test_list_shaders_multiple_files() {
        let temp_dir = TempDir::new().unwrap();
        
        // Create multiple shader files
        fs::write(temp_dir.path().join("vertex.wgsl"), "fn vs_main() {}").await.unwrap();
        fs::write(temp_dir.path().join("fragment.wgsl"), "fn fs_main() {}").await.unwrap();
        fs::write(temp_dir.path().join("compute.wgsl"), "fn cs_main() {}").await.unwrap();
        fs::write(temp_dir.path().join("not_a_shader.txt"), "ignored").await.unwrap();
        
        let service = create_test_service(temp_dir.path().to_str().unwrap());
        
        let shaders = service.list_shaders().unwrap();
        
        assert_eq!(shaders.len(), 3);
        assert!(shaders.contains(&"vertex.wgsl".to_string()));
        assert!(shaders.contains(&"fragment.wgsl".to_string()));
        assert!(shaders.contains(&"compute.wgsl".to_string()));
        assert!(!shaders.contains(&"not_a_shader.txt".to_string()));
    }
}
