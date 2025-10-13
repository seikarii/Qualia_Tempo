//! # Responsibility
//! Analizador de AST para código TypeScript usando tree-sitter.

use super::LanguageAnalyzer;
use crate::ast_analyzer::AnalysisResult;
use crate::types::{GraphEdge, GraphNode};
use anyhow::{Context, Result};
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use tree_sitter::Parser;

/// # Responsibility
/// Implementación del analizador para lenguaje TypeScript.
pub struct TypeScriptAnalyzer;

impl LanguageAnalyzer for TypeScriptAnalyzer {
    fn analyze(&self, file_path: &Path, module_path: &str) -> Result<AnalysisResult> {
        let content = fs::read_to_string(file_path)
            .with_context(|| format!("Error al leer fichero TypeScript: {}", file_path.display()))?;
        
        let mut parser = Parser::new();
        parser
            .set_language(&tree_sitter_typescript::language_typescript().into())
            .context("Error al configurar parser de TypeScript")?;
        
        let tree = parser
            .parse(&content, None)
            .context("Error al parsear fichero TypeScript")?;
        
        let mut nodes = Vec::new();
        let mut edges = Vec::new();
        
        // Crear nodo para el módulo
        let module_id = if module_path.is_empty() {
            "root".to_string()
        } else {
            module_path.to_string()
        };
        
        let mut metadata = HashMap::new();
        metadata.insert("language".to_string(), "typescript".to_string());
        
        nodes.push(GraphNode {
            id: module_id.clone(),
            node_type: "module".to_string(),
            file_path: Some(file_path.display().to_string()),
            description: None,
            public_methods: Vec::new(),
            public_fields: Vec::new(),
            implements_traits: Vec::new(),
            metadata,
        });
        
        let root_node = tree.root_node();
        
        // Extraer interfaces
        self.extract_interfaces(&content, &root_node, &module_path, &mut nodes, &mut edges)?;
        
        // Extraer clases
        self.extract_classes(&content, &root_node, &module_path, &mut nodes, &mut edges)?;
        
        // Extraer funciones exportadas
        self.extract_functions(&content, &root_node, &module_path, &mut nodes, &mut edges)?;
        
        // Extraer imports/exports
        self.extract_imports(&content, &root_node, &module_id, &mut edges)?;
        
        Ok(AnalysisResult { nodes, edges })
    }
    
    fn infer_module_path(&self, file_path: &Path, root_path: &Path) -> String {
        let relative = file_path.strip_prefix(root_path).unwrap_or(file_path);
        
        let mut components: Vec<String> = relative
            .components()
            .filter_map(|c| c.as_os_str().to_str())
            .map(|s| s.to_string())
            .collect();
        
        // Remover extensión
        if let Some(last) = components.last_mut() {
            if let Some(name) = last.strip_suffix(".ts").or_else(|| last.strip_suffix(".tsx")) {
                *last = name.to_string();
            }
        }
        
        // Convertir index a nombre del directorio padre
        if components.last().map(|s| s.as_str()) == Some("index") {
            components.pop();
        }
        
        if components.is_empty() {
            "root".to_string()
        } else {
            components.join(".")
        }
    }
}

impl TypeScriptAnalyzer {
    /// Extrae interfaces del AST
    fn extract_interfaces(
        &self,
        source: &str,
        root: &tree_sitter::Node,
        module_path: &str,
        nodes: &mut Vec<GraphNode>,
        edges: &mut Vec<GraphEdge>,
    ) -> Result<()> {
        let mut cursor = root.walk();
        
        for node in root.children(&mut cursor) {
            if node.kind() == "interface_declaration" {
                if let Some(name_node) = node.child_by_field_name("name") {
                    let name = &source[name_node.byte_range()];
                    let id = if module_path.is_empty() {
                        name.to_string()
                    } else {
                        format!("{}.{}", module_path, name)
                    };
                    
                    // Extraer métodos y propiedades
                    let mut public_methods = Vec::new();
                    let mut public_fields = Vec::new();
                    let mut implements_traits = Vec::new();
                    
                    if let Some(body) = node.child_by_field_name("body") {
                        let mut body_cursor = body.walk();
                        for child in body.children(&mut body_cursor) {
                            match child.kind() {
                                "property_signature" => {
                                    let prop_text = &source[child.byte_range()];
                                    public_fields.push(prop_text.to_string());
                                }
                                "method_signature" => {
                                    let method_text = &source[child.byte_range()];
                                    public_methods.push(method_text.to_string());
                                }
                                _ => {}
                            }
                        }
                    }
                    
                    // Extraer extends
                    if let Some(heritage) = node.child_by_field_name("heritage") {
                        let heritage_text = &source[heritage.byte_range()];
                        implements_traits.push(heritage_text.to_string());
                    }
                    
                    nodes.push(GraphNode {
                        id: id.clone(),
                        node_type: "interface".to_string(),
                        file_path: None,
                        description: None,
                        public_methods,
                        public_fields,
                        implements_traits,
                        metadata: HashMap::new(),
                    });
                }
            }
        }
        
        Ok(())
    }
    
    /// Extrae clases del AST
    fn extract_classes(
        &self,
        source: &str,
        root: &tree_sitter::Node,
        module_path: &str,
        nodes: &mut Vec<GraphNode>,
        edges: &mut Vec<GraphEdge>,
    ) -> Result<()> {
        let mut cursor = root.walk();
        
        for node in root.children(&mut cursor) {
            if node.kind() == "class_declaration" || node.kind() == "export_statement" {
                // Manejar export class
                let class_node = if node.kind() == "export_statement" {
                    node.child_by_field_name("declaration")
                        .and_then(|n| if n.kind() == "class_declaration" { Some(n) } else { None })
                } else {
                    Some(node)
                };
                
                if let Some(class_node) = class_node {
                    if let Some(name_node) = class_node.child_by_field_name("name") {
                        let name = &source[name_node.byte_range()];
                        let id = if module_path.is_empty() {
                            name.to_string()
                        } else {
                            format!("{}.{}", module_path, name)
                        };
                        
                        let mut public_methods = Vec::new();
                        let mut public_fields = Vec::new();
                        let mut implements_traits = Vec::new();
                        
                        // Extraer heritage (implements/extends)
                        if let Some(heritage) = class_node.child_by_field_name("heritage") {
                            let heritage_text = &source[heritage.byte_range()];
                            implements_traits.push(heritage_text.to_string());
                        }
                        
                        // Extraer body
                        if let Some(body) = class_node.child_by_field_name("body") {
                            let mut body_cursor = body.walk();
                            for child in body.children(&mut body_cursor) {
                                match child.kind() {
                                    "field_definition" | "public_field_definition" => {
                                        let field_text = &source[child.byte_range()];
                                        public_fields.push(field_text.to_string());
                                    }
                                    "method_definition" => {
                                        // Solo public methods
                                        let method_text = &source[child.byte_range()];
                                        if !method_text.contains("private") && !method_text.contains("protected") {
                                            public_methods.push(method_text.to_string());
                                        }
                                    }
                                    _ => {}
                                }
                            }
                        }
                        
                        nodes.push(GraphNode {
                            id: id.clone(),
                            node_type: "class".to_string(),
                            file_path: None,
                            description: None,
                            public_methods,
                            public_fields,
                            implements_traits,
                            metadata: HashMap::new(),
                        });
                    }
                }
            }
        }
        
        Ok(())
    }
    
    /// Extrae funciones exportadas
    fn extract_functions(
        &self,
        source: &str,
        root: &tree_sitter::Node,
        module_path: &str,
        nodes: &mut Vec<GraphNode>,
        _edges: &mut Vec<GraphEdge>,
    ) -> Result<()> {
        let mut cursor = root.walk();
        
        for node in root.children(&mut cursor) {
            if node.kind() == "export_statement" {
                if let Some(decl) = node.child_by_field_name("declaration") {
                    if decl.kind() == "function_declaration" || decl.kind() == "arrow_function" {
                        if let Some(name_node) = decl.child_by_field_name("name") {
                            let name = &source[name_node.byte_range()];
                            let id = if module_path.is_empty() {
                                name.to_string()
                            } else {
                                format!("{}.{}", module_path, name)
                            };
                            
                            nodes.push(GraphNode {
                                id: id.clone(),
                                node_type: "function".to_string(),
                                file_path: None,
                                description: None,
                                public_methods: Vec::new(),
                                public_fields: Vec::new(),
                                implements_traits: Vec::new(),
                                metadata: HashMap::new(),
                            });
                        }
                    }
                }
            }
        }
        
        Ok(())
    }
    
    /// Extrae imports
    fn extract_imports(
        &self,
        source: &str,
        root: &tree_sitter::Node,
        module_id: &str,
        edges: &mut Vec<GraphEdge>,
    ) -> Result<()> {
        let mut cursor = root.walk();
        
        for node in root.children(&mut cursor) {
            if node.kind() == "import_statement" {
                if let Some(source_node) = node.child_by_field_name("source") {
                    let import_path = &source[source_node.byte_range()];
                    // Limpiar comillas
                    let import_path = import_path.trim_matches(|c| c == '"' || c == '\'');
                    
                    edges.push(GraphEdge {
                        source: module_id.to_string(),
                        target: import_path.to_string(),
                        label: "imports".to_string(),
                        metadata: HashMap::new(),
                    });
                }
            }
        }
        
        Ok(())
    }
}
