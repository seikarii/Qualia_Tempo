//! # Responsibility
//! Analizador de AST para código Rust usando syn crate.

use super::LanguageAnalyzer;
use crate::ast_analyzer::AnalysisResult;
use crate::types::{GraphEdge, GraphNode};
use anyhow::{Context, Result};
use quote::quote;
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use syn::visit::Visit;
use syn::{Attribute, File, ImplItem, ItemImpl, Visibility};

/// # Responsibility
/// Implementación del analizador para lenguaje Rust.
pub struct RustAnalyzer;

impl LanguageAnalyzer for RustAnalyzer {
    fn analyze(&self, file_path: &Path, module_path: &str) -> Result<AnalysisResult> {
        let content = fs::read_to_string(file_path)
            .with_context(|| format!("Error al leer fichero Rust: {}", file_path.display()))?;
        
        let ast: File = syn::parse_file(&content)
            .with_context(|| format!("Error al parsear fichero Rust: {}", file_path.display()))?;
        
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
    
    fn infer_module_path(&self, file_path: &Path, root_path: &Path) -> String {
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

impl RustAnalyzer {
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
}

/// Analizador de AST que implementa el patrón Visitor.
struct AstVisitor {
    file_path: String,
    module_path: String,
    nodes: Vec<GraphNode>,
    edges: Vec<GraphEdge>,
    current_source_id: Option<String>,
    module_id: String,
}

impl AstVisitor {
    /// Normaliza el espaciado de una firma generada por quote!
    fn normalize_signature(sig: String) -> String {
        let mut result = sig;
        
        result = result.replace(" &mut ", "&mut ");
        result = result.replace(" & ", "&");
        result = result.replace("& ", "&");
        result = result.replace(" :: ", "::");
        result = result.replace(" ::", "::");
        result = result.replace(":: ", "::");
        result = result.replace(" :", ":");
        result = result.replace(":", ": ");
        result = result.replace(":  ", ": ");
        result = result.replace("::  ", "::");
        result = result.replace(": :", "::");
        result = result.replace(" , ", ", ");
        result = result.replace(" ,", ",");
        result = result.replace(",", ", ");
        result = result.replace(",  ", ", ");
        result = result.replace("( ", "(");
        result = result.replace(" )", ")");
        result = result.replace("->", " -> ");
        result = result.replace("  ->", " ->");
        result = result.replace("->  ", " -> ");
        
        result
    }

    fn new_with_doc(file_path: String, module_path: String, module_doc: Option<String>) -> Self {
        let module_id = if module_path.is_empty() {
            "crate".to_string()
        } else {
            module_path.clone()
        };
        
        let mut metadata = HashMap::new();
        metadata.insert("language".to_string(), "rust".to_string());
        
        let module_node = GraphNode {
            id: module_id.clone(),
            node_type: "module".to_string(),
            file_path: Some(file_path.clone()),
            description: module_doc,
            public_methods: Vec::new(),
            public_fields: Vec::new(),
            implements_traits: Vec::new(),
            metadata,
        };
        
        Self {
            file_path,
            module_path,
            nodes: vec![module_node],
            edges: Vec::new(),
            current_source_id: Some(module_id.clone()),
            module_id,
        }
    }
    
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
    
    fn is_public(vis: &Visibility) -> bool {
        matches!(vis, Visibility::Public(_))
    }
    
    fn build_item_id(&self, name: &str) -> String {
        if self.module_path.is_empty() {
            format!("crate::{}", name)
        } else {
            format!("{}::{}", self.module_path, name)
        }
    }
    
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

impl<'ast> Visit<'ast> for AstVisitor {
    fn visit_item_struct(&mut self, node: &'ast syn::ItemStruct) {
        if !Self::is_public(&node.vis) {
            return;
        }
        
        let name = node.ident.to_string();
        let id = self.build_item_id(&name);
        let description = self.extract_doc_comment(&node.attrs);
        
        let public_fields: Vec<String> = node
            .fields
            .iter()
            .filter(|f| Self::is_public(&f.vis))
            .filter_map(|f| {
                if let Some(ident) = &f.ident {
                    let vis = &f.vis;
                    let ty = &f.ty;
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
            file_path: None,
            description,
            public_methods: Vec::new(),
            public_fields,
            implements_traits: Vec::new(),
            metadata: HashMap::new(),
        });
        
        let previous_source = self.current_source_id.clone();
        self.current_source_id = Some(id);
        syn::visit::visit_item_struct(self, node);
        self.current_source_id = previous_source;
    }
    
    fn visit_item_enum(&mut self, node: &'ast syn::ItemEnum) {
        if !Self::is_public(&node.vis) {
            return;
        }
        
        let name = node.ident.to_string();
        let id = self.build_item_id(&name);
        let description = self.extract_doc_comment(&node.attrs);
        let variants: Vec<String> = node.variants.iter().map(|v| v.ident.to_string()).collect();
        
        self.nodes.push(GraphNode {
            id: id.clone(),
            node_type: "enum".to_string(),
            file_path: None,
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
    
    fn visit_item_trait(&mut self, node: &'ast syn::ItemTrait) {
        if !Self::is_public(&node.vis) {
            return;
        }
        
        let name = node.ident.to_string();
        let id = self.build_item_id(&name);
        let description = self.extract_doc_comment(&node.attrs);
        
        let methods: Vec<String> = node
            .items
            .iter()
            .filter_map(|item| {
                if let syn::TraitItem::Fn(method) = item {
                    let sig = &method.sig;
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
            file_path: None,
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
            file_path: None,
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
    
    fn visit_item_impl(&mut self, node: &'ast ItemImpl) {
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
            
            if let Some((_, trait_path, _)) = &node.trait_ {
                let trait_name = trait_path
                    .segments
                    .last()
                    .map(|seg| seg.ident.to_string())
                    .unwrap_or_default();
                
                self.edges.push(GraphEdge {
                    source: type_id.clone(),
                    target: format!("trait::{}", trait_name),
                    label: "implements".to_string(),
                    metadata: HashMap::new(),
                });
                
                if let Some(node) = self.nodes.iter_mut().find(|n| n.id == type_id) {
                    node.implements_traits.push(trait_name);
                }
            }
            
            for item in &node.items {
                if let ImplItem::Fn(method) = item {
                    if Self::is_public(&method.vis) {
                        let vis = &method.vis;
                        let sig = &method.sig;
                        let method_signature = quote! { #vis #sig };
                        let method_string = Self::normalize_signature(method_signature.to_string());
                        
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
    
    fn visit_item_use(&mut self, node: &'ast syn::ItemUse) {
        if let Some(source_id) = &self.current_source_id {
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
