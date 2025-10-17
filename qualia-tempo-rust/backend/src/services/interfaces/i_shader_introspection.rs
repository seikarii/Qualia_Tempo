//! # Responsibility
//! Shader introspection service interface for WGSL metadata extraction.

use shaku::Interface;
use async_trait::async_trait;
use anyhow::Result;

/// # Responsibility
/// Uniform buffer layout metadata.
#[derive(Debug, Clone)]
pub struct UniformBufferLayout {
    pub binding: u32,
    pub size: usize,
    pub fields: Vec<UniformField>,
}

/// # Responsibility
/// Uniform field metadata.
#[derive(Debug, Clone)]
pub struct UniformField {
    pub name: String,
    pub offset: usize,
    pub size: usize,
    pub field_type: String,
}

/// # Responsibility
/// Extracts shader metadata from WGSL source using naga.
///
/// ---
///
/// This service provides:
/// - WGSL parsing with naga
/// - Uniform buffer layout extraction
/// - Bind group description generation
/// - Pipeline requirement analysis
/// - Syntax error reporting with line numbers
#[async_trait]
pub trait IShaderIntrospectionService: Interface {
    /// Parses WGSL shader source and extracts metadata.
    ///
    /// # Arguments
    /// * `shader_source` - WGSL source code
    ///
    /// # Returns
    /// Uniform buffer layouts
    async fn parse_shader(&self, shader_source: &str) -> Result<Vec<UniformBufferLayout>>;
    
    /// Validates WGSL shader syntax.
    ///
    /// # Arguments
    /// * `shader_source` - WGSL source code
    ///
    /// # Returns
    /// Ok(()) if valid, Err with line numbers if invalid
    async fn validate_shader(&self, shader_source: &str) -> Result<()>;
}
