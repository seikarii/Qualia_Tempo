//! # Responsibility
//! Analizador de AST para código Python usando tree-sitter.

use super::LanguageAnalyzer;
use crate::ast_analyzer::AnalysisResult;
use crate::types::{GraphEdge, GraphNode};
use anyhow::{Context, Result};
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use tree_sitter::Parser;

/// # Responsibility
/// Implementación del analizador para lenguaje Python.
pub struct PythonAnalyzer;

impl LanguageAnalyzer for PythonAnalyzer {
    fn analyze(&self, file_path: &Path, module_path: &str) -> Result<AnalysisResult> {
        let content = fs::read_to_string(file_path)
            .with_context(|| format!("Error al leer fichero Python: {}", file_path.display()))?;
        
        let mut parser = Parser::new();
        parser
            .set_language(&tree_sitter_python::language().into())
            .context("Error al configurar parser de Python")?;
        
        let tree = parser
            .parse(&content, None)
            .context("Error al parsear fichero Python")?;
        
        let mut nodes = Vec::new();
        let mut edges = Vec::new();
        
        // Crear nodo para el módulo
        let module_id = if module_path.is_empty() {
            "__main__".to_string()
        } else {
            module_path.to_string()
        };
        
        let mut metadata = HashMap::new();
        metadata.insert("language".to_string(), "python".to_string());
        
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
        
        // Extraer clases
        self.extract_classes(&content, &root_node, &module_path, &mut nodes, &mut edges)?;
        
        // Extraer funciones
        self.extract_functions(&content, &root_node, &module_path, &mut nodes)?;
        
        // Extraer imports
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
            if let Some(name) = last.strip_suffix(".py") {
                *last = name.to_string();
            }
        }
        
        // Convertir __init__ a nombre del directorio padre
        if components.last().map(|s| s.as_str()) == Some("__init__") {
            components.pop();
        }
        
        if components.is_empty() {
            "__main__".to_string()
        } else {
            components.join(".")
        }
    }
}

impl PythonAnalyzer {
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
            if node.kind() == "class_definition" {
                if let Some(name_node) = node.child_by_field_name("name") {
                    let name = &source[name_node.byte_range()];
                    
                    // En Python, clases con _ prefix son privadas
                    if name.starts_with('_') && !name.starts_with("__") {
                        continue;
                    }
                    
                    let id = if module_path.is_empty() {
                        name.to_string()
                    } else {
                        format!("{}.{}", module_path, name)
                    };
                    
                    let mut public_methods = Vec::new();
                    let mut public_fields = Vec::new();
                    let mut implements_traits = Vec::new();
                    
                    // Extraer bases (herencia)
                    if let Some(superclasses) = node.child_by_field_name("superclasses") {
                        let mut super_cursor = superclasses.walk();
                        for child in superclasses.children(&mut super_cursor) {
                            if child.kind() == "identifier" {
                                let base = &source[child.byte_range()];
                                implements_traits.push(base.to_string());
                            }
                        }
                    }
                    
                    // Extraer body
                    if let Some(body) = node.child_by_field_name("body") {
                        let mut body_cursor = body.walk();
                        for child in body.children(&mut body_cursor) {
                            match child.kind() {
                                "function_definition" => {
                                    if let Some(func_name) = child.child_by_field_name("name") {
                                        let func_name_str = &source[func_name.byte_range()];
                                        
                                        // Filtrar métodos privados
                                        if func_name_str.starts_with('_') && !func_name_str.starts_with("__") {
                                            continue;
                                        }
                                        
                                        // Extraer decorators
                                        let mut decorators = Vec::new();
                                        let mut decorator_cursor = child.walk();
                                        for dchild in child.children(&mut decorator_cursor) {
                                            if dchild.kind() == "decorator" {
                                                decorators.push(&source[dchild.byte_range()]);
                                            }
                                        }
                                        
                                        // Construir firma del método
                                        let params = if let Some(params_node) = child.child_by_field_name("parameters") {
                                            &source[params_node.byte_range()]
                                        } else {
                                            "()"
                                        };
                                        
                                        let decorator_str = if !decorators.is_empty() {
                                            format!("{} ", decorators.join(" "))
                                        } else {
                                            String::new()
                                        };
                                        
                                        let method_sig = format!("{}def {}{}", decorator_str, func_name_str, params);
                                        public_methods.push(method_sig);
                                    }
                                }
                                "expression_statement" => {
                                    // Capturar class variables (fields)
                                    if let Some(assignment) = child.child(0) {
                                        if assignment.kind() == "assignment" {
                                            let field_text = &source[assignment.byte_range()];
                                            public_fields.push(field_text.to_string());
                                        }
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
        
        Ok(())
    }
    
    /// Extrae funciones top-level
    fn extract_functions(
        &self,
        source: &str,
        root: &tree_sitter::Node,
        module_path: &str,
        nodes: &mut Vec<GraphNode>,
    ) -> Result<()> {
        let mut cursor = root.walk();
        
        for node in root.children(&mut cursor) {
            if node.kind() == "function_definition" {
                if let Some(name_node) = node.child_by_field_name("name") {
                    let name = &source[name_node.byte_range()];
                    
                    // Filtrar funciones privadas
                    if name.starts_with('_') && !name.starts_with("__") {
                        continue;
                    }
                    
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
            match node.kind() {
                "import_statement" => {
                    // import module
                    if let Some(name_node) = node.child_by_field_name("name") {
                        let import_name = &source[name_node.byte_range()];
                        edges.push(GraphEdge {
                            source: module_id.to_string(),
                            target: import_name.to_string(),
                            label: "imports".to_string(),
                            metadata: HashMap::new(),
                        });
                    }
                }
                "import_from_statement" => {
                    // from module import something
                    if let Some(module_node) = node.child_by_field_name("module_name") {
                        let import_name = &source[module_node.byte_range()];
                        edges.push(GraphEdge {
                            source: module_id.to_string(),
                            target: import_name.to_string(),
                            label: "imports".to_string(),
                            metadata: HashMap::new(),
                        });
                    }
                }
                _ => {}
            }
        }
        
        Ok(())
    }
}
