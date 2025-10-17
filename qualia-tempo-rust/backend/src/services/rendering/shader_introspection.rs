//! # Responsibility
//! Shader introspection service implementation using naga.

use shaku::Component;
use async_trait::async_trait;
use anyhow::{Result, Context, bail};
use std::sync::Arc;
use tracing::{info, debug, instrument};

use crate::services::interfaces::{IShaderIntrospectionService, ILogger, UniformBufferLayout, UniformField};

/// # Responsibility
/// Implements shader introspection using naga for WGSL parsing.
///
/// ---
///
/// Features:
/// - WGSL parsing with naga
/// - Uniform buffer layout extraction
/// - Syntax error reporting with line numbers
/// - Type information extraction
#[derive(Component)]
#[shaku(interface = IShaderIntrospectionService)]
pub struct ShaderIntrospectionService {
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,
}

#[async_trait]
impl IShaderIntrospectionService for ShaderIntrospectionService {
    #[instrument(skip(self, shader_source))]
    async fn parse_shader(&self, shader_source: &str) -> Result<Vec<UniformBufferLayout>> {
        self.logger.info("Parsing WGSL shader");
        
        // Parse WGSL with naga
        let module = naga::front::wgsl::parse_str(shader_source)
            .map_err(|e| anyhow::anyhow!("WGSL parse error: {:?}", e))?;
        
        let mut layouts = Vec::new();
        
        // Extract uniform buffer layouts
        for (_handle, global_var) in module.global_variables.iter() {
            if let Some(binding) = &global_var.binding {
                // Check if this is a uniform buffer
                if let naga::AddressSpace::Uniform = global_var.space {
                    let ty = &module.types[global_var.ty];
                    
                    let mut fields = Vec::new();
                    
                    // Extract struct fields if this is a struct
                    if let naga::TypeInner::Struct { members, .. } = &ty.inner {
                        let mut offset = 0usize;
                        
                        for member in members {
                            let member_ty = &module.types[member.ty];
                            let size = Self::get_type_size(&member_ty.inner);
                            
                            fields.push(UniformField {
                                name: member.name.clone().unwrap_or_else(|| "unnamed".to_string()),
                                offset,
                                size,
                                field_type: Self::get_type_name(&member_ty.inner),
                            });
                            
                            offset += size;
                        }
                    }
                    
                    let total_size = Self::get_type_size(&ty.inner);
                    
                    layouts.push(UniformBufferLayout {
                        binding: binding.binding,
                        size: total_size,
                        fields,
                    });
                }
            }
        }
        
        debug!("Extracted {} uniform buffer layouts", layouts.len());
        Ok(layouts)
    }
    
    #[instrument(skip(self, shader_source))]
    async fn validate_shader(&self, shader_source: &str) -> Result<()> {
        self.logger.info("Validating WGSL shader");
        
        // Parse and validate
        naga::front::wgsl::parse_str(shader_source)
            .map_err(|e| anyhow::anyhow!("WGSL validation error: {:?}", e))?;
        
        self.logger.info("Shader validation successful");
        Ok(())
    }
}

impl ShaderIntrospectionService {
    /// Gets size of type in bytes.
    fn get_type_size(ty: &naga::TypeInner) -> usize {
        match ty {
            naga::TypeInner::Scalar { kind, width } => *width as usize / 8,
            naga::TypeInner::Vector { size, kind, width } => {
                let element_size = *width as usize / 8;
                let count = match size {
                    naga::VectorSize::Bi => 2,
                    naga::VectorSize::Tri => 3,
                    naga::VectorSize::Quad => 4,
                };
                element_size * count
            }
            naga::TypeInner::Matrix { columns, rows, width } => {
                let element_size = *width as usize / 8;
                let col_count = match columns {
                    naga::VectorSize::Bi => 2,
                    naga::VectorSize::Tri => 3,
                    naga::VectorSize::Quad => 4,
                };
                let row_count = match rows {
                    naga::VectorSize::Bi => 2,
                    naga::VectorSize::Tri => 3,
                    naga::VectorSize::Quad => 4,
                };
                element_size * col_count * row_count
            }
            naga::TypeInner::Struct { members, .. } => {
                members.iter().map(|m| 16).sum() // Simplified: assume 16-byte alignment
            }
            _ => 16, // Default size
        }
    }
    
    /// Gets type name string.
    fn get_type_name(ty: &naga::TypeInner) -> String {
        match ty {
            naga::TypeInner::Scalar { kind, .. } => format!("{:?}", kind).to_lowercase(),
            naga::TypeInner::Vector { size, kind, .. } => {
                let count = match size {
                    naga::VectorSize::Bi => 2,
                    naga::VectorSize::Tri => 3,
                    naga::VectorSize::Quad => 4,
                };
                format!("vec{}<{:?}>", count, kind).to_lowercase()
            }
            naga::TypeInner::Matrix { columns, rows, .. } => {
                let cols = match columns {
                    naga::VectorSize::Bi => 2,
                    naga::VectorSize::Tri => 3,
                    naga::VectorSize::Quad => 4,
                };
                let rows_count = match rows {
                    naga::VectorSize::Bi => 2,
                    naga::VectorSize::Tri => 3,
                    naga::VectorSize::Quad => 4,
                };
                format!("mat{}x{}", cols, rows_count)
            }
            naga::TypeInner::Struct { .. } => "struct".to_string(),
            _ => "unknown".to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::tests::mocks::MockLogger;
    
    const VALID_SHADER: &str = r#"
        struct Uniforms {
            view_proj: mat4x4<f32>,
            time: f32,
        }
        
        @group(0) @binding(0) var<uniform> uniforms: Uniforms;
        
        @vertex
        fn vs_main() -> @builtin(position) vec4<f32> {
            return vec4<f32>(0.0, 0.0, 0.0, 1.0);
        }
    "#;
    
    const INVALID_SHADER: &str = r#"
        this is not valid WGSL syntax!
    "#;
    
    #[tokio::test]
    async fn test_validate_shader_success() {
        let mut mock_logger = MockLogger::new();
        mock_logger.expect_info().return_const(());
        
        let service = ShaderIntrospectionService {
            logger: Arc::new(mock_logger),
        };
        
        let result = service.validate_shader(VALID_SHADER).await;
        assert!(result.is_ok());
    }
    
    #[tokio::test]
    async fn test_validate_shader_failure() {
        let mut mock_logger = MockLogger::new();
        mock_logger.expect_info().return_const(());
        
        let service = ShaderIntrospectionService {
            logger: Arc::new(mock_logger),
        };
        
        let result = service.validate_shader(INVALID_SHADER).await;
        assert!(result.is_err());
    }
    
    #[tokio::test]
    async fn test_parse_shader_extracts_uniforms() {
        let mut mock_logger = MockLogger::new();
        mock_logger.expect_info().return_const(());
        
        let service = ShaderIntrospectionService {
            logger: Arc::new(mock_logger),
        };
        
        let result = service.parse_shader(VALID_SHADER).await;
        assert!(result.is_ok());
        
        let layouts = result.unwrap();
        assert!(!layouts.is_empty());
        assert_eq!(layouts[0].binding, 0);
    }
}
