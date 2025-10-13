//! # Responsibility
//! Orquestador de análisis de AST multi-lenguaje.
//!
//! Este módulo delega el análisis a los analizadores específicos
//! de cada lenguaje y provee la interfaz unificada.

use crate::language_analyzers::{LanguageAnalyzer, python_analyzer::PythonAnalyzer, rust_analyzer::RustAnalyzer, typescript_analyzer::TypeScriptAnalyzer};
use crate::types::{GraphEdge, GraphNode, Language};
use anyhow::Result;
use std::path::Path;

/// # Responsibility
/// Resultado del análisis de un fichero.
#[derive(Debug, Clone)]
pub struct AnalysisResult {
    /// Nodos extraídos del fichero
    pub nodes: Vec<GraphNode>,
    
    /// Aristas (dependencias) extraídas del fichero
    pub edges: Vec<GraphEdge>,
}

/// # Responsibility
/// Motor de análisis de AST que delega a analizadores específicos por lenguaje.
pub struct AstAnalyzer;

impl AstAnalyzer {
    /// Analiza un fichero de código fuente según su lenguaje.
    ///
    /// # Argumentos
    ///
    /// * `file_path` - Path al fichero a analizar
    /// * `module_path` - Path del módulo inferido
    /// * `language` - Lenguaje del fichero
    ///
    /// # Retorna
    ///
    /// Un `AnalysisResult` con los nodos y aristas extraídos.
    pub fn analyze_file(file_path: &Path, module_path: &str, language: Language) -> Result<AnalysisResult> {
        match language {
            Language::Rust => {
                let analyzer = RustAnalyzer;
                analyzer.analyze(file_path, module_path)
            }
            Language::TypeScript => {
                let analyzer = TypeScriptAnalyzer;
                analyzer.analyze(file_path, module_path)
            }
            Language::Python => {
                let analyzer = PythonAnalyzer;
                analyzer.analyze(file_path, module_path)
            }
        }
    }
    
    /// Infiere el module path desde el file path según el lenguaje.
    pub fn infer_module_path(file_path: &Path, root_path: &Path, language: Language) -> String {
        match language {
            Language::Rust => {
                let analyzer = RustAnalyzer;
                analyzer.infer_module_path(file_path, root_path)
            }
            Language::TypeScript => {
                let analyzer = TypeScriptAnalyzer;
                analyzer.infer_module_path(file_path, root_path)
            }
            Language::Python => {
                let analyzer = PythonAnalyzer;
                analyzer.infer_module_path(file_path, root_path)
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_infer_module_path_rust() {
        let root = PathBuf::from("/project");
        
        let path1 = PathBuf::from("/project/src/services/audio.rs");
        assert_eq!(
            AstAnalyzer::infer_module_path(&path1, &root, Language::Rust),
            "crate::services::audio"
        );
        
        let path2 = PathBuf::from("/project/src/lib.rs");
        assert_eq!(
            AstAnalyzer::infer_module_path(&path2, &root, Language::Rust), 
            "crate"
        );
    }
    
    #[test]
    fn test_infer_module_path_typescript() {
        let root = PathBuf::from("/project");
        
        let path1 = PathBuf::from("/project/packages/core/src/services/audio.ts");
        assert_eq!(
            AstAnalyzer::infer_module_path(&path1, &root, Language::TypeScript),
            "packages.core.src.services.audio"
        );
        
        let path2 = PathBuf::from("/project/src/index.ts");
        assert_eq!(
            AstAnalyzer::infer_module_path(&path2, &root, Language::TypeScript),
            "src"
        );
    }
    
    #[test]
    fn test_infer_module_path_python() {
        let root = PathBuf::from("/project");
        
        let path1 = PathBuf::from("/project/src/services/audio.py");
        assert_eq!(
            AstAnalyzer::infer_module_path(&path1, &root, Language::Python),
            "src.services.audio"
        );
        
        let path2 = PathBuf::from("/project/src/__init__.py");
        assert_eq!(
            AstAnalyzer::infer_module_path(&path2, &root, Language::Python),
            "src"
        );
    }
}
