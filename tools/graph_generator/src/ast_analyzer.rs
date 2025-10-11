//! Análisis de AST (Abstract Syntax Tree) de código Rust.
//!
//! Este módulo utiliza syn para parsear y analizar código Rust,
//! extrayendo información sobre estructuras, funciones, traits y dependencias.

use crate::types::{GraphEdge, GraphNode};
use anyhow::{Context, Result};
use quote::quote;
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use syn::visit::Visit;
use syn::{Attribute, File, ImplItem, ItemImpl, Visibility};

/// Resultado del análisis de un fichero.
#[derive(Debug, Clone)]
pub struct AnalysisResult {
    /// Nodos extraídos del fichero
    pub nodes: Vec<GraphNode>,
    
    /// Aristas (dependencias) extraídas del fichero
    pub edges: Vec<GraphEdge>,
}

/// Analizador de AST que implementa el patrón Visitor.
struct AstVisitor {
    file_path: String,
    module_path: String,
    nodes: Vec<GraphNode>,
    edges: Vec<GraphEdge>,
    current_source_id: Option<String>,
    module_id: String, // ID del módulo actual (fichero)
}

impl AstVisitor {
    /// Normaliza el espaciado de una firma generada por quote!
    /// Elimina espacios extra alrededor de & y :: para mejorar legibilidad
    fn normalize_signature(sig: String) -> String {
        // Multiple passes to clean up all spacing issues
        let mut result = sig;
        
        // Fix references: "& mut" -> "&mut", "& str" -> "&str", etc.
        result = result.replace(" &mut ", "&mut ");
        result = result.replace(" & ", "&");
        result = result.replace("& ", "&");
        
        // Fix path separators: " :: " -> "::"
        result = result.replace(" :: ", "::");
        result = result.replace(" ::", "::");
        result = result.replace(":: ", "::");
        
        // Fix colons: " :" -> ":", ": " -> ": " (space after, not before)
        result = result.replace(" :", ":");
        result = result.replace(":", ": ");
        result = result.replace(":  ", ": "); // Fix double spaces
        result = result.replace("::  ", "::"); // But don't break :: paths
        result = result.replace(": :", "::"); // Fix broken :: paths
        
        // Fix commas: ensure space after, not before
        result = result.replace(" , ", ", ");
        result = result.replace(" ,", ",");
        result = result.replace(",", ", ");
        result = result.replace(",  ", ", "); // Fix double spaces
        
        // Fix parentheses: no space inside
        result = result.replace("( ", "(");
        result = result.replace(" )", ")");
        
        // Fix arrows: " -> " is correct
        result = result.replace("->", " -> ");
        result = result.replace("  ->", " ->");
        result = result.replace("->  ", " -> ");
        
        result
    }

    fn new_with_doc(file_path: String, module_path: String, module_doc: Option<String>) -> Self {
        // Crear un nodo para el módulo (fichero) en sí
        let module_id = if module_path.is_empty() {
            "crate".to_string()
        } else {
            module_path.clone()
        };
        
        let module_node = GraphNode {
            id: module_id.clone(),
            node_type: "module".to_string(),
            file_path: Some(file_path.clone()), // Only modules have file_path to avoid redundancy
            description: module_doc, // Use actual doc comment or None (no redundant auto-generated text)
            public_methods: Vec::new(),
            public_fields: Vec::new(),
            implements_traits: Vec::new(),
            metadata: HashMap::new(),
        };
        
        Self {
            file_path,
            module_path,
            nodes: vec![module_node],
            edges: Vec::new(),
            current_source_id: Some(module_id.clone()), // Por defecto, el módulo es la fuente
            module_id,
        }
    }
    
    /// Extrae la documentación de los atributos.
    fn extract_doc_comment(&self, attrs: &[Attribute]) -> Option<String> {
        let mut docs = Vec::new();
        
        for attr in attrs {
            if attr.path().is_ident("doc") {
                if let syn::Meta::NameValue(meta) = &attr.meta {
                    if let syn::Expr::Lit(expr_lit) = &meta.value {
                        if let syn::Lit::Str(lit_str) = &expr_lit.lit {
                            let doc = lit_str.value().trim().to_string();
                            if !doc.is_empty() {
                                docs.push(doc);
                            }
                        }
                    }
                }
            }
        }
        
        if docs.is_empty() {
            None
        } else {
            Some(docs.join(" "))
        }
    }
    
    /// Verifica si la visibilidad es pública.
    fn is_public(vis: &Visibility) -> bool {
        matches!(vis, Visibility::Public(_))
    }
    
    /// Construye un ID completo para un item.
    fn build_item_id(&self, name: &str) -> String {
        if self.module_path.is_empty() {
            format!("crate::{}", name)
        } else {
            format!("{}::{}", self.module_path, name)
        }
    }
}

impl<'ast> Visit<'ast> for AstVisitor {
    /// Visita declaraciones de structs.
    fn visit_item_struct(&mut self, node: &'ast syn::ItemStruct) {
        if !Self::is_public(&node.vis) {
            return;
        }
        
        let name = node.ident.to_string();
        let id = self.build_item_id(&name);
        let description = self.extract_doc_comment(&node.attrs);
        
        // Extraer campos públicos con FULL type information
        let public_fields: Vec<String> = node
            .fields
            .iter()
            .filter(|f| Self::is_public(&f.vis))
            .filter_map(|f| {
                if let Some(ident) = &f.ident {
                    let vis = &f.vis;
                    let ty = &f.ty;
                    // Use quote! to convert AST back to Rust code string
                    let field_decl = quote! { #vis #ident: #ty };
                    Some(Self::normalize_signature(field_decl.to_string()))
                } else {
                    None
                }
            })
            .collect();
        
        self.nodes.push(GraphNode {
            id: id.clone(),
            node_type: "struct".to_string(),
            file_path: None, // Omit file_path for non-module nodes to reduce redundancy
            description,
            public_methods: Vec::new(), // Se añadirán desde impl blocks
            public_fields,
            implements_traits: Vec::new(),
            metadata: HashMap::new(),
        });
        
        // Guardar el contexto anterior (el módulo) y establecer el struct como fuente
        let previous_source = self.current_source_id.clone();
        self.current_source_id = Some(id);
        
        syn::visit::visit_item_struct(self, node);
        
        // Restaurar el contexto anterior (el módulo)
        self.current_source_id = previous_source;
    }
    
    /// Visita declaraciones de enums.
    fn visit_item_enum(&mut self, node: &'ast syn::ItemEnum) {
        if !Self::is_public(&node.vis) {
            return;
        }
        
        let name = node.ident.to_string();
        let id = self.build_item_id(&name);
        let description = self.extract_doc_comment(&node.attrs);
        
        // Extraer variantes como "métodos" para uniformidad
        let variants: Vec<String> = node.variants.iter().map(|v| v.ident.to_string()).collect();
        
        self.nodes.push(GraphNode {
            id: id.clone(),
            node_type: "enum".to_string(),
            file_path: None, // Omit file_path for non-module nodes to reduce redundancy
            description,
            public_methods: variants,
            public_fields: Vec::new(),
            implements_traits: Vec::new(),
            metadata: HashMap::new(),
        });
        
        let previous_source = self.current_source_id.clone();
        self.current_source_id = Some(id);
        syn::visit::visit_item_enum(self, node);
        self.current_source_id = previous_source;
    }
    
    /// Visita declaraciones de traits.
    fn visit_item_trait(&mut self, node: &'ast syn::ItemTrait) {
        if !Self::is_public(&node.vis) {
            return;
        }
        
        let name = node.ident.to_string();
        let id = self.build_item_id(&name);
        let description = self.extract_doc_comment(&node.attrs);
        
        // Extraer métodos del trait con FULL signatures
        let methods: Vec<String> = node
            .items
            .iter()
            .filter_map(|item| {
                if let syn::TraitItem::Fn(method) = item {
                    let sig = &method.sig;
                    // Trait methods don't have visibility modifiers, but we want to show "fn" keyword
                    let method_signature = quote! { #sig };
                    Some(Self::normalize_signature(method_signature.to_string()))
                } else {
                    None
                }
            })
            .collect();
        
        self.nodes.push(GraphNode {
            id: id.clone(),
            node_type: "trait".to_string(),
            file_path: None, // Omit file_path for non-module nodes to reduce redundancy
            description,
            public_methods: methods,
            public_fields: Vec::new(),
            implements_traits: Vec::new(),
            metadata: HashMap::new(),
        });
        
        let previous_source = self.current_source_id.clone();
        self.current_source_id = Some(id);
        syn::visit::visit_item_trait(self, node);
        self.current_source_id = previous_source;
    }
    
    /// Visita funciones standalone.
    fn visit_item_fn(&mut self, node: &'ast syn::ItemFn) {
        if !Self::is_public(&node.vis) {
            return;
        }
        
        let name = node.sig.ident.to_string();
        let id = self.build_item_id(&name);
        let description = self.extract_doc_comment(&node.attrs);
        
        self.nodes.push(GraphNode {
            id: id.clone(),
            node_type: "function".to_string(),
            file_path: None, // Omit file_path for non-module nodes to reduce redundancy
            description,
            public_methods: Vec::new(),
            public_fields: Vec::new(),
            implements_traits: Vec::new(),
            metadata: HashMap::new(),
        });
        
        let previous_source = self.current_source_id.clone();
        self.current_source_id = Some(id);
        syn::visit::visit_item_fn(self, node);
        self.current_source_id = previous_source;
    }
    
    /// Visita bloques impl para extraer métodos.
    fn visit_item_impl(&mut self, node: &'ast ItemImpl) {
        // Obtener el nombre del tipo al que se aplica el impl
        let type_name = if let syn::Type::Path(type_path) = &*node.self_ty {
            type_path
                .path
                .segments
                .last()
                .map(|seg| seg.ident.to_string())
        } else {
            None
        };
        
        if let Some(type_name) = type_name {
            let type_id = self.build_item_id(&type_name);
            
            // Extraer trait implementado (si aplica)
            if let Some((_, trait_path, _)) = &node.trait_ {
                let trait_name = trait_path
                    .segments
                    .last()
                    .map(|seg| seg.ident.to_string())
                    .unwrap_or_default();
                
                // Añadir arista de implementación
                self.edges.push(GraphEdge {
                    source: type_id.clone(),
                    target: format!("trait::{}", trait_name),
                    label: "implements".to_string(),
                    metadata: HashMap::new(),
                });
                
                // Actualizar el nodo con el trait implementado
                if let Some(node) = self.nodes.iter_mut().find(|n| n.id == type_id) {
                    node.implements_traits.push(trait_name);
                }
            }
            
            // Extraer métodos públicos con FULL signatures
            for item in &node.items {
                if let ImplItem::Fn(method) = item {
                    if Self::is_public(&method.vis) {
                        let vis = &method.vis;
                        let sig = &method.sig;
                        
                        // Use quote! to convert full signature to Rust code string
                        let method_signature = quote! { #vis #sig };
                        let method_string = Self::normalize_signature(method_signature.to_string());
                        
                        // Añadir método al nodo correspondiente
                        if let Some(node) = self.nodes.iter_mut().find(|n| n.id == type_id) {
                            if !node.public_methods.contains(&method_string) {
                                node.public_methods.push(method_string);
                            }
                        }
                    }
                }
            }
        }
        
        syn::visit::visit_item_impl(self, node);
    }
    
    /// Visita declaraciones use para extraer dependencias.
    fn visit_item_use(&mut self, node: &'ast syn::ItemUse) {
        if let Some(source_id) = &self.current_source_id {
            // Extraer el path del use
            let use_path = self.extract_use_path(&node.tree);
            
            for path in use_path {
                self.edges.push(GraphEdge {
                    source: source_id.clone(),
                    target: path,
                    label: "uses".to_string(),
                    metadata: HashMap::new(),
                });
            }
        }
        
        syn::visit::visit_item_use(self, node);
    }
}

impl AstVisitor {
    /// Extrae paths de use statements.
    fn extract_use_path(&self, tree: &syn::UseTree) -> Vec<String> {
        let mut paths = Vec::new();
        
        match tree {
            syn::UseTree::Path(path) => {
                let prefix = path.ident.to_string();
                for sub_path in self.extract_use_path(&path.tree) {
                    paths.push(format!("{}::{}", prefix, sub_path));
                }
            }
            syn::UseTree::Name(name) => {
                paths.push(name.ident.to_string());
            }
            syn::UseTree::Rename(rename) => {
                paths.push(rename.ident.to_string());
            }
            syn::UseTree::Glob(_) => {
                paths.push("*".to_string());
            }
            syn::UseTree::Group(group) => {
                for item in &group.items {
                    paths.extend(self.extract_use_path(item));
                }
            }
        }
        
        paths
    }
}

/// Motor de análisis de AST.
pub struct AstAnalyzer;

impl AstAnalyzer {
    /// Analiza un fichero de código fuente y extrae nodos y aristas.
    ///
    /// # Argumentos
    ///
    /// * `file_path` - Path al fichero a analizar
    /// * `module_path` - Path del módulo (ej. "crate::services::audio")
    ///
    /// # Retorna
    ///
    /// Un `AnalysisResult` con los nodos y aristas extraídos.
    pub fn analyze_file(file_path: &Path, module_path: &str) -> Result<AnalysisResult> {
        let content = fs::read_to_string(file_path)
            .with_context(|| format!("Error al leer fichero: {}", file_path.display()))?;
        
        let ast: File = syn::parse_file(&content)
            .with_context(|| format!("Error al parsear fichero: {}", file_path.display()))?;
        
        // Extraer documentación del módulo (//! comments) desde el AST
        let module_doc = Self::extract_module_doc(&ast.attrs);
        
        let mut visitor = AstVisitor::new_with_doc(
            file_path.display().to_string(),
            module_path.to_string(),
            module_doc,
        );
        
        // Recorrer el AST
        for item in &ast.items {
            visitor.visit_item(item);
        }
        
        Ok(AnalysisResult {
            nodes: visitor.nodes,
            edges: visitor.edges,
        })
    }
    
    /// Extrae la documentación del módulo (//! comments)
    fn extract_module_doc(attrs: &[Attribute]) -> Option<String> {
        let mut docs = Vec::new();
        
        for attr in attrs {
            if attr.path().is_ident("doc") {
                if let syn::Meta::NameValue(meta) = &attr.meta {
                    if let syn::Expr::Lit(expr_lit) = &meta.value {
                        if let syn::Lit::Str(lit_str) = &expr_lit.lit {
                            let doc = lit_str.value().trim().to_string();
                            if !doc.is_empty() {
                                docs.push(doc);
                            }
                        }
                    }
                }
            }
        }
        
        if docs.is_empty() {
            None
        } else {
            Some(docs.join(" "))
        }
    }
    
    /// Infiere el module path desde el file path.
    /// Ej: "/project/src/services/audio.rs" -> "crate::services::audio"
    pub fn infer_module_path(file_path: &Path, root_path: &Path) -> String {
        let relative = file_path.strip_prefix(root_path).unwrap_or(file_path);
        
        let mut components: Vec<String> = relative
            .components()
            .filter_map(|c| c.as_os_str().to_str())
            .map(|s| s.to_string())
            .collect();
        
        // Remover "src" si está presente
        if components.first().map(|s| s.as_str()) == Some("src") {
            components.remove(0);
        }
        
        // Remover extensión del último componente
        if let Some(last) = components.last_mut() {
            if let Some(name) = last.strip_suffix(".rs") {
                *last = name.to_string();
            }
        }
        
        // Convertir "mod.rs" o "lib.rs" al nombre del directorio padre
        if components.last().map(|s| s.as_str()) == Some("mod")
            || components.last().map(|s| s.as_str()) == Some("lib")
        {
            components.pop();
        }
        
        if components.is_empty() {
            "crate".to_string()
        } else {
            format!("crate::{}", components.join("::"))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_infer_module_path() {
        let root = PathBuf::from("/project");
        
        let path1 = PathBuf::from("/project/src/services/audio.rs");
        assert_eq!(
            AstAnalyzer::infer_module_path(&path1, &root),
            "crate::services::audio"
        );
        
        let path2 = PathBuf::from("/project/src/lib.rs");
        assert_eq!(AstAnalyzer::infer_module_path(&path2, &root), "crate");
        
        let path3 = PathBuf::from("/project/src/services/mod.rs");
        assert_eq!(
            AstAnalyzer::infer_module_path(&path3, &root),
            "crate::services"
        );
    }
    
    #[test]
    fn test_parse_simple_struct() {
        use tempfile::NamedTempFile;
        use std::io::Write;
        
        let mut file = NamedTempFile::new().unwrap();
        writeln!(
            file,
            r#"
            /// Test struct documentation
            pub struct TestStruct {{
                pub field1: String,
                field2: i32,
            }}
            
            impl TestStruct {{
                pub fn new() -> Self {{
                    Self {{ field1: String::new(), field2: 0 }}
                }}
            }}
            "#
        )
        .unwrap();
        
        let result = AstAnalyzer::analyze_file(file.path(), "test").unwrap();
        
        // Now we should have 2 nodes: 1 module + 1 struct
        assert_eq!(result.nodes.len(), 2);
        
        // First node should be the module
        assert_eq!(result.nodes[0].node_type, "module");
        assert_eq!(result.nodes[0].id, "test");
        
        // Second node should be the struct
        assert_eq!(result.nodes[1].node_type, "struct");
        assert_eq!(result.nodes[1].id, "test::TestStruct");
        assert!(result.nodes[1].description.is_some());
        assert_eq!(result.nodes[1].public_fields.len(), 1);
        assert_eq!(result.nodes[1].public_methods.len(), 1);
    }
}
