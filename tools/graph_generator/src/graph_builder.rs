//! Construcción del grafo arquitectónico a partir de análisis de ficheros.
//!
//! Este módulo orquesta el proceso completo: descubrimiento, análisis
//! y ensamblaje del grafo final.

use crate::ast_analyzer::{AnalysisResult, AstAnalyzer};
use crate::file_discovery::{DiscoveredFile, FileDiscovery};
use crate::types::ProjectGraph;
use anyhow::{Context, Result};
use std::path::Path;

/// Constructor del grafo del proyecto.
pub struct GraphBuilder {
    discovery: FileDiscovery,
}

impl GraphBuilder {
    /// Crea un nuevo constructor con la configuración de descubrimiento dada.
    pub fn new(discovery: FileDiscovery) -> Self {
        Self { discovery }
    }
    

    /// Construye el grafo completo del proyecto.
    ///
    /// # Argumentos
    ///
    /// * `root_path` - Directorio raíz del proyecto a analizar
    ///
    /// # Retorna
    ///
    /// Un `ProjectGraph` completamente poblado con nodos y aristas.
    pub fn build(&self, root_path: &Path) -> Result<ProjectGraph> {
        println!("🏗️  Iniciando construcción del grafo arquitectónico...\n");
        
        // Fase 1: Descubrimiento de ficheros
        let files = self
            .discovery
            .discover(root_path)
            .context("Error durante el descubrimiento de ficheros")?;
        
        if files.is_empty() {
            anyhow::bail!("No se encontraron ficheros válidos para analizar en: {}", root_path.display());
        }
        
        println!("\n📝 Analizando {} ficheros...\n", files.len());
        
        // Fase 2: Análisis de cada fichero
        let mut graph = ProjectGraph::new();
        let mut successful = 0;
        let mut failed = 0;
        
        for file in &files {
            match self.analyze_file(file, root_path) {
                Ok(result) => {
                    self.merge_analysis_result(&mut graph, result);
                    successful += 1;
                    println!("  ✓ {}", file.path.display());
                }
                Err(e) => {
                    failed += 1;
                    eprintln!("  ✗ {}: {}", file.path.display(), e);
                }
            }
        }
        
        // Fase 3: Post-procesamiento
        self.post_process_graph(&mut graph);
        
        // Añadir metadata
        graph.add_metadata("analyzed_path".to_string(), root_path.display().to_string());
        graph.add_metadata("total_files".to_string(), files.len().to_string());
        graph.add_metadata("successful".to_string(), successful.to_string());
        graph.add_metadata("failed".to_string(), failed.to_string());
        graph.add_metadata("total_nodes".to_string(), graph.nodes.len().to_string());
        graph.add_metadata("total_edges".to_string(), graph.edges.len().to_string());
        graph.add_metadata(
            "timestamp".to_string(),
            chrono::Utc::now().to_rfc3339(),
        );
        graph.add_metadata("generator_version".to_string(), env!("CARGO_PKG_VERSION").to_string());
        
        println!("\n✅ Grafo construido exitosamente:");
        println!("   • Nodos: {}", graph.nodes.len());
        println!("   • Aristas: {}", graph.edges.len());
        println!("   • Ficheros analizados: {} exitosos, {} fallidos", successful, failed);
        
        Ok(graph)
    }
    
    /// Analiza un fichero individual.
    fn analyze_file(&self, file: &DiscoveredFile, root_path: &Path) -> Result<AnalysisResult> {
        let module_path = AstAnalyzer::infer_module_path(&file.path, root_path);
        AstAnalyzer::analyze_file(&file.path, &module_path)
    }
    
    /// Combina el resultado de un análisis en el grafo principal.
    fn merge_analysis_result(&self, graph: &mut ProjectGraph, result: AnalysisResult) {
        for node in result.nodes {
            graph.add_node(node);
        }
        
        for edge in result.edges {
            graph.add_edge(edge);
        }
    }
    
    /// Post-procesa el grafo para limpieza y optimización.
    fn post_process_graph(&self, graph: &mut ProjectGraph) {
        // Remover aristas duplicadas
        graph.edges.sort_by(|a, b| {
            a.source
                .cmp(&b.source)
                .then(a.target.cmp(&b.target))
                .then(a.label.cmp(&b.label))
        });
        graph.edges.dedup_by(|a, b| {
            a.source == b.source && a.target == b.target && a.label == b.label
        });
        
        // Remover aristas que apuntan a nodos inexistentes (dependencias externas)
        // Pero mantener registro de ellas como metadata
        let node_ids: std::collections::HashSet<_> = graph.nodes.iter().map(|n| &n.id).collect();
        
        let external_deps: Vec<_> = graph
            .edges
            .iter()
            .filter(|e| !node_ids.contains(&e.target))
            .map(|e| e.target.clone())
            .collect();
        
        if !external_deps.is_empty() {
            let mut unique_deps = external_deps;
            unique_deps.sort();
            unique_deps.dedup();
            graph.add_metadata(
                "external_dependencies".to_string(),
                unique_deps.join(", "),
            );
        }
        
        // Ordenar nodos alfabéticamente por ID para output consistente
        graph.nodes.sort_by(|a, b| a.id.cmp(&b.id));
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::io::Write;
    use tempfile::tempdir;

    #[test]
    fn test_build_graph_from_directory() -> Result<()> {
        let dir = tempdir()?;
        let src_dir = dir.path().join("src");
        fs::create_dir(&src_dir)?;
        
        // Crear fichero de ejemplo
        let file_path = src_dir.join("lib.rs");
        let mut file = fs::File::create(&file_path)?;
        writeln!(
            file,
            r#"
            /// Main service struct
            pub struct Service {{
                pub name: String,
            }}
            
            impl Service {{
                pub fn new(name: String) -> Self {{
                    Self {{ name }}
                }}
                
                pub fn run(&self) {{
                    println!("Running {{}}", self.name);
                }}
            }}
            "#
        )?;
        
        let builder = GraphBuilder::with_defaults();
        let graph = builder.build(&src_dir)?;
        
        assert!(graph.nodes.len() > 0);
        assert!(graph.metadata.contains_key("total_nodes"));
        assert!(graph.metadata.contains_key("timestamp"));
        
        Ok(())
    }
}
