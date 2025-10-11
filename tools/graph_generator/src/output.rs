//! Serialización y escritura del grafo del proyecto.
//!
//! Este módulo se encarga de escribir el grafo generado a disco
//! en formato JSON estructurado.

use crate::types::ProjectGraph;
use anyhow::{Context, Result};
use std::fs::File;
use std::io::Write;
use std::path::Path;

/// Escritor de grafos.
pub struct GraphWriter;

impl GraphWriter {
    /// Escribe el grafo a un fichero JSON.
    ///
    /// # Argumentos
    ///
    /// * `graph` - El grafo a escribir
    /// * `output_path` - Path donde escribir el fichero JSON
    ///
    /// # Retorna
    ///
    /// Ok(()) si la escritura fue exitosa.
    pub fn write_to_file(graph: &ProjectGraph, output_path: &Path) -> Result<()> {
        println!("\n💾 Escribiendo grafo a: {}", output_path.display());
        
        // Serializar con formato pretty para legibilidad
        let json = serde_json::to_string_pretty(graph)
            .context("Error al serializar el grafo a JSON")?;
        
        // Escribir a fichero
        let mut file = File::create(output_path)
            .with_context(|| format!("No se pudo crear el fichero: {}", output_path.display()))?;
        
        file.write_all(json.as_bytes())
            .with_context(|| format!("Error al escribir a: {}", output_path.display()))?;
        
        println!("✅ Grafo escrito exitosamente ({} bytes)", json.len());
        
        Ok(())
    }
    
    /// Genera estadísticas del grafo en formato legible.
    pub fn generate_stats(graph: &ProjectGraph) -> String {
        let mut stats = String::new();
        
        stats.push_str("📊 Estadísticas del Grafo\n");
        stats.push_str("─────────────────────────\n\n");
        
        // Contadores por tipo de nodo
        let mut struct_count = 0;
        let mut enum_count = 0;
        let mut trait_count = 0;
        let mut function_count = 0;
        
        for node in &graph.nodes {
            match node.node_type.as_str() {
                "struct" => struct_count += 1,
                "enum" => enum_count += 1,
                "trait" => trait_count += 1,
                "function" => function_count += 1,
                _ => {}
            }
        }
        
        stats.push_str(&format!("Nodos totales: {}\n", graph.nodes.len()));
        stats.push_str(&format!("  • Structs: {}\n", struct_count));
        stats.push_str(&format!("  • Enums: {}\n", enum_count));
        stats.push_str(&format!("  • Traits: {}\n", trait_count));
        stats.push_str(&format!("  • Funciones: {}\n\n", function_count));
        
        // Contadores por tipo de arista
        let mut uses_count = 0;
        let mut implements_count = 0;
        
        for edge in &graph.edges {
            match edge.label.as_str() {
                "uses" => uses_count += 1,
                "implements" => implements_count += 1,
                _ => {}
            }
        }
        
        stats.push_str(&format!("Aristas totales: {}\n", graph.edges.len()));
        stats.push_str(&format!("  • Uses: {}\n", uses_count));
        stats.push_str(&format!("  • Implements: {}\n\n", implements_count));
        
        // Top 5 nodos con más conexiones salientes
        let mut node_connections: Vec<_> = graph
            .nodes
            .iter()
            .map(|node| {
                let outgoing = graph.edges.iter().filter(|e| e.source == node.id).count();
                (node.id.clone(), outgoing)
            })
            .collect();
        
        node_connections.sort_by(|a, b| b.1.cmp(&a.1));
        
        stats.push_str("Top 5 nodos más conectados:\n");
        for (id, count) in node_connections.iter().take(5) {
            stats.push_str(&format!("  • {} ({} conexiones)\n", id, count));
        }
        
        stats
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{GraphNode, ProjectGraph};
    use std::collections::HashMap;
    use tempfile::NamedTempFile;

    #[test]
    fn test_write_to_file() -> Result<()> {
        let mut graph = ProjectGraph::new();
        graph.add_node(GraphNode {
            id: "test::MyStruct".to_string(),
            node_type: "struct".to_string(),
            file_path: None,
            description: Some("Test".to_string()),
            public_methods: vec![],
            public_fields: vec![],
            implements_traits: vec![],
            metadata: HashMap::new(),
        });
        
        let file = NamedTempFile::new()?;
        GraphWriter::write_to_file(&graph, file.path())?;
        
        // Verificar que el fichero existe y tiene contenido
        let content = std::fs::read_to_string(file.path())?;
        assert!(!content.is_empty());
        assert!(content.contains("test::MyStruct"));
        
        Ok(())
    }
    
    #[test]
    fn test_generate_stats() {
        let mut graph = ProjectGraph::new();
        graph.add_node(GraphNode {
            id: "test::Struct1".to_string(),
            node_type: "struct".to_string(),
            file_path: None,
            description: None,
            public_methods: vec![],
            public_fields: vec![],
            implements_traits: vec![],
            metadata: HashMap::new(),
        });
        graph.add_node(GraphNode {
            id: "test::Enum1".to_string(),
            node_type: "enum".to_string(),
            file_path: None,
            description: None,
            public_methods: vec![],
            public_fields: vec![],
            implements_traits: vec![],
            metadata: HashMap::new(),
        });
        
        let stats = GraphWriter::generate_stats(&graph);
        
        assert!(stats.contains("Nodos totales: 2"));
        assert!(stats.contains("Structs: 1"));
        assert!(stats.contains("Enums: 1"));
    }
}
