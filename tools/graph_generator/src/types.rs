//! Tipos de datos para la representación del grafo arquitectónico.
//!
//! Este módulo define las estructuras serializables que componen el
//! project_graph.json final.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fmt;

/// # Responsibility
/// Representa los lenguajes soportados por el analizador.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Language {
    /// Lenguaje Rust (.rs)
    Rust,
    /// Lenguaje TypeScript (.ts, .tsx)
    TypeScript,
    /// Lenguaje Python (.py)
    Python,
}

impl Language {
    /// Detecta el lenguaje a partir de una extensión de archivo.
    pub fn from_extension(ext: &str) -> Option<Self> {
        match ext.to_lowercase().as_str() {
            "rs" => Some(Language::Rust),
            "ts" | "tsx" => Some(Language::TypeScript),
            "py" => Some(Language::Python),
            _ => None,
        }
    }
    
    /// Retorna todas las extensiones válidas para este lenguaje.
    pub fn extensions(&self) -> &'static [&'static str] {
        match self {
            Language::Rust => &["rs"],
            Language::TypeScript => &["ts", "tsx"],
            Language::Python => &["py"],
        }
    }
}

impl fmt::Display for Language {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Language::Rust => write!(f, "Rust"),
            Language::TypeScript => write!(f, "TypeScript"),
            Language::Python => write!(f, "Python"),
        }
    }
}

/// Representa un nodo en el grafo arquitectónico.
/// Puede ser un struct, enum, trait u otro tipo de definición pública.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct GraphNode {
    /// Identificador único del nodo (ej. "crate::services::audio::AudioService")
    pub id: String,
    
    /// Tipo de nodo: "struct", "enum", "trait", "function", "module"
    #[serde(rename = "type")]
    pub node_type: String,
    
    /// Ruta del fichero donde se define este nodo.
    /// ONLY present for "module" nodes to avoid redundancy.
    /// For other nodes, the file can be inferred from the module ID.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file_path: Option<String>,
    
    /// Descripción extraída de los doc comments (///)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    
    /// Lista de métodos públicos (solo para structs/enums/traits)
    #[serde(skip_serializing_if = "Vec::is_empty", default)]
    pub public_methods: Vec<String>,
    
    /// Campos públicos del struct (si aplica)
    #[serde(skip_serializing_if = "Vec::is_empty", default)]
    pub public_fields: Vec<String>,
    
    /// Traits implementados (si aplica)
    #[serde(skip_serializing_if = "Vec::is_empty", default)]
    pub implements_traits: Vec<String>,
    
    /// Metadata adicional (extensible)
    #[serde(skip_serializing_if = "HashMap::is_empty", default)]
    pub metadata: HashMap<String, String>,
}

/// Representa una arista (conexión) en el grafo arquitectónico.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct GraphEdge {
    /// ID del nodo origen
    pub source: String,
    
    /// ID del nodo destino
    pub target: String,
    
    /// Tipo de relación: "uses", "imports", "implements", "depends_on"
    pub label: String,
    
    /// Metadata adicional sobre la relación
    #[serde(skip_serializing_if = "HashMap::is_empty", default)]
    pub metadata: HashMap<String, String>,
}

/// Estructura principal del grafo del proyecto.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectGraph {
    /// Todos los nodos del grafo
    pub nodes: Vec<GraphNode>,
    
    /// Todas las aristas del grafo
    pub edges: Vec<GraphEdge>,
    
    /// Metadata del análisis (versión, timestamp, path analizado, etc.)
    #[serde(skip_serializing_if = "HashMap::is_empty", default)]
    pub metadata: HashMap<String, String>,
}

impl ProjectGraph {
    /// Crea un nuevo grafo vacío.
    pub fn new() -> Self {
        Self {
            nodes: Vec::new(),
            edges: Vec::new(),
            metadata: HashMap::new(),
        }
    }
    
    /// Añade un nodo al grafo si no existe ya.
    pub fn add_node(&mut self, node: GraphNode) {
        if !self.nodes.iter().any(|n| n.id == node.id) {
            self.nodes.push(node);
        }
    }
    
    /// Añade una arista al grafo.
    pub fn add_edge(&mut self, edge: GraphEdge) {
        self.edges.push(edge);
    }
    
    /// Añade metadata al grafo.
    pub fn add_metadata(&mut self, key: String, value: String) {
        self.metadata.insert(key, value);
    }
}

impl Default for ProjectGraph {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_project_graph_creation() {
        let mut graph = ProjectGraph::new();
        assert_eq!(graph.nodes.len(), 0);
        assert_eq!(graph.edges.len(), 0);
        
        graph.add_node(GraphNode {
            id: "test::MyStruct".to_string(),
            node_type: "struct".to_string(),
            file_path: None,
            description: Some("Test struct".to_string()),
            public_methods: vec!["new".to_string()],
            public_fields: vec![],
            implements_traits: vec![],
            metadata: HashMap::new(),
        });
        
        assert_eq!(graph.nodes.len(), 1);
    }
    
    #[test]
    fn test_no_duplicate_nodes() {
        let mut graph = ProjectGraph::new();
        let node = GraphNode {
            id: "test::MyStruct".to_string(),
            node_type: "struct".to_string(),
            file_path: None,
            description: None,
            public_methods: vec![],
            public_fields: vec![],
            implements_traits: vec![],
            metadata: HashMap::new(),
        };
        
        graph.add_node(node.clone());
        graph.add_node(node);
        
        assert_eq!(graph.nodes.len(), 1);
    }
}
