//! Descubrimiento y filtrado de ficheros de código fuente.
//!
//! Este módulo se encarga de recorrer el árbol de directorios y
//! filtrar los ficheros que cumplen los criterios para ser analizados.

use anyhow::{Context, Result};
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

/// Configuración para el descubrimiento de ficheros.
#[derive(Debug, Clone)]
pub struct DiscoveryConfig {
    /// Extensiones de fichero permitidas (ej. ["rs", "ts"])
    pub allowed_extensions: Vec<String>,
    
    /// Máximo número de líneas permitido por fichero
    pub max_lines: usize,
    
    /// Directorios a ignorar (ej. "target", "node_modules")
    pub ignored_dirs: Vec<String>,
}

impl Default for DiscoveryConfig {
    fn default() -> Self {
        Self {
            allowed_extensions: vec!["rs".to_string()],
            max_lines: 3000,
            ignored_dirs: vec![
                "target".to_string(),
                "node_modules".to_string(),
                ".git".to_string(),
                "dist".to_string(),
                "build".to_string(),
            ],
        }
    }
}

/// Información sobre un fichero descubierto.
#[derive(Debug, Clone)]
pub struct DiscoveredFile {
    /// Ruta absoluta del fichero
    pub path: PathBuf,
    
    /// Número de líneas del fichero
    pub line_count: usize,
    
    /// Extensión del fichero
    pub extension: String,
}

/// Motor de descubrimiento de ficheros.
pub struct FileDiscovery {
    config: DiscoveryConfig,
}

impl FileDiscovery {
    /// Crea un nuevo motor de descubrimiento con la configuración dada.
    pub fn new(config: DiscoveryConfig) -> Self {
        Self { config }
    }
    
    /// Crea un motor con la configuración por defecto.
    pub fn with_defaults() -> Self {
        Self::new(DiscoveryConfig::default())
    }

    /// Descubre todos los ficheros válidos en el directorio dado.
    ///
    /// # Argumentos
    ///
    /// * `root_path` - Directorio raíz donde comenzar el descubrimiento
    ///
    /// # Retorna
    ///
    /// Un vector de `DiscoveredFile` con todos los ficheros que cumplen los criterios.
    pub fn discover(&self, root_path: &Path) -> Result<Vec<DiscoveredFile>> {
        let mut discovered = Vec::new();
        
        println!("🔍 Iniciando descubrimiento en: {}", root_path.display());
        
        for entry in WalkDir::new(root_path)
            .follow_links(false)
            .into_iter()
            .filter_entry(|e| self.should_process_entry(e))
        {
            let entry = entry.context("Error al leer entrada del directorio")?;
            
            if !entry.file_type().is_file() {
                continue;
            }
            
            let path = entry.path();
            
            // Verificar extensión
            if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                if !self.config.allowed_extensions.contains(&ext.to_string()) {
                    continue;
                }
                
                // Contar líneas
                match self.count_lines(path) {
                    Ok(line_count) => {
                        if line_count <= self.config.max_lines {
                            discovered.push(DiscoveredFile {
                                path: path.to_path_buf(),
                                line_count,
                                extension: ext.to_string(),
                            });
                            println!("  ✓ {} ({} líneas)", path.display(), line_count);
                        } else {
                            println!(
                                "  ⊗ {} (IGNORADO: {} líneas > {} límite)",
                                path.display(),
                                line_count,
                                self.config.max_lines
                            );
                        }
                    }
                    Err(e) => {
                        eprintln!("  ⚠ Error al leer {}: {}", path.display(), e);
                    }
                }
            }
        }
        
        println!("\n📊 Total ficheros descubiertos: {}", discovered.len());
        Ok(discovered)
    }
    
    /// Determina si una entrada de directorio debe ser procesada.
    fn should_process_entry(&self, entry: &walkdir::DirEntry) -> bool {
        if let Some(name) = entry.file_name().to_str() {
            // Ignorar directorios en la lista negra
            if entry.file_type().is_dir() && self.config.ignored_dirs.contains(&name.to_string()) {
                return false;
            }
            // Ignorar ficheros ocultos
            if name.starts_with('.') && name != "." {
                return false;
            }
        }
        true
    }
    
    /// Cuenta el número de líneas en un fichero.
    fn count_lines(&self, path: &Path) -> Result<usize> {
        let content = fs::read_to_string(path)
            .with_context(|| format!("No se pudo leer el fichero: {}", path.display()))?;
        Ok(content.lines().count())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;
    use std::io::Write;
    use tempfile::tempdir;

    #[test]
    fn test_discovery_with_valid_file() -> Result<()> {
        let dir = tempdir()?;
        let src_dir = dir.path().join("src");
        fs::create_dir(&src_dir)?;
        let file_path = src_dir.join("test.rs");
        let mut file = File::create(&file_path)?;
        writeln!(file, "fn main() {{}}")?;
        drop(file); // Cerrar el file handle
        
        let discovery = FileDiscovery::with_defaults();
        let files = discovery.discover(&src_dir)?; // Buscar en src_dir directamente
        
        assert_eq!(files.len(), 1);
        assert_eq!(files[0].path, file_path);
        assert_eq!(files[0].line_count, 1);
        
        Ok(())
    }
    
    #[test]
    fn test_discovery_ignores_large_files() -> Result<()> {
        let dir = tempdir()?;
        let src_dir = dir.path().join("src");
        fs::create_dir(&src_dir)?;
        let file_path = src_dir.join("large.rs");
        let mut file = File::create(&file_path)?;
        
        // Escribir más de 3000 líneas
        for _ in 0..3001 {
            writeln!(file, "// comment")?;
        }
        drop(file); // Cerrar el file handle
        
        let discovery = FileDiscovery::with_defaults();
        let files = discovery.discover(&src_dir)?;
        
        assert_eq!(files.len(), 0);
        
        Ok(())
    }
    
    #[test]
    fn test_discovery_ignores_wrong_extension() -> Result<()> {
        let dir = tempdir()?;
        let src_dir = dir.path().join("src");
        fs::create_dir(&src_dir)?;
        let file_path = src_dir.join("test.txt");
        let mut file = File::create(&file_path)?;
        writeln!(file, "not rust code")?;
        drop(file); // Cerrar el file handle
        
        let discovery = FileDiscovery::with_defaults();
        let files = discovery.discover(&src_dir)?;
        
        assert_eq!(files.len(), 0);
        
        Ok(())
    }
}
