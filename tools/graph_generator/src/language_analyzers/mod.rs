//! # Responsibility
//! Define el trait común para todos los analizadores de lenguajes
//! y expone los módulos de análisis específicos.

use crate::ast_analyzer::AnalysisResult;
use anyhow::Result;
use std::path::Path;

pub mod rust_analyzer;
pub mod typescript_analyzer;
pub mod python_analyzer;

/// # Responsibility
/// Trait que deben implementar todos los analizadores de lenguajes.
/// 
/// Cada implementación debe parsear el código fuente de su lenguaje
/// y extraer nodos (tipos, funciones, clases) y edges (dependencias).
pub trait LanguageAnalyzer {
    /// Analiza un fichero de código fuente y retorna el resultado.
    ///
    /// # Arguments
    ///
    /// * `file_path` - Ruta absoluta al fichero a analizar
    /// * `module_path` - Ruta lógica del módulo (ej. "crate::services::audio")
    ///
    /// # Returns
    ///
    /// `AnalysisResult` con los nodos y edges extraídos del fichero.
    fn analyze(&self, file_path: &Path, module_path: &str) -> Result<AnalysisResult>;
    
    /// Infiere la ruta del módulo a partir de la estructura de directorios.
    ///
    /// # Arguments
    ///
    /// * `file_path` - Ruta absoluta al fichero
    /// * `root_path` - Ruta raíz del proyecto
    ///
    /// # Returns
    ///
    /// Ruta del módulo inferida (ej. "src.services.audio" para TS/Python, "crate::services::audio" para Rust)
    fn infer_module_path(&self, file_path: &Path, root_path: &Path) -> String;
}
