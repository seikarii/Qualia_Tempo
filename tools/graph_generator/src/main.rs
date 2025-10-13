//! Graph Generator - Generador de Mapa de Grafo Arquitectónico (GMGA)
//!
//! # Responsibility
//! Herramienta de línea de comandos para analizar código multi-lenguaje
//! (Rust, TypeScript, Python) y generar un mapa completo del grafo arquitectónico.
//!
//! # Uso
//!
//! ```bash
//! graph_generator --path /ruta/al/proyecto
//! graph_generator --path /ruta/al/proyecto --output custom_graph.json
//! graph_generator --path /ruta/al/proyecto --max-lines 5000 --extensions "rs,ts,py"
//! ```

mod ast_analyzer;
mod file_discovery;
mod graph_builder;
mod language_analyzers;
mod output;
mod types;

use anyhow::{Context, Result};
use clap::Parser;
use file_discovery::DiscoveryConfig;
use graph_builder::GraphBuilder;
use output::GraphWriter;
use std::path::PathBuf;

/// Generador de Mapa de Grafo Arquitectónico para proyectos Rust
#[derive(Parser, Debug)]
#[command(
    name = "graph_generator",
    version,
    about = "Analiza proyectos Rust y genera un mapa de grafo arquitectónico en JSON",
    long_about = "El Graph Generator (GMGA) recorre un directorio de proyecto Rust, \
                  analiza su estructura mediante parsing de AST, y genera un fichero \
                  project_graph.json con información completa sobre tipos, funciones, \
                  y sus relaciones. Ideal para herramientas de IA que necesitan entender \
                  la arquitectura de un proyecto."
)]
struct Cli {
    /// Ruta al directorio raíz del proyecto a analizar
    #[arg(short, long, value_name = "PATH")]
    path: PathBuf,

    /// Ruta del fichero JSON de salida
    #[arg(short, long, value_name = "FILE", default_value = "project_graph.json")]
    output: PathBuf,

    /// Máximo número de líneas permitido por fichero
    #[arg(long, value_name = "NUM", default_value = "3000")]
    max_lines: usize,

    /// Extensiones de fichero a analizar (separadas por comas)
    #[arg(long, value_name = "EXTS", default_value = "rs,ts,tsx,py")]
    extensions: String,

    /// Directorios a ignorar (separados por comas)
    #[arg(
        long,
        value_name = "DIRS",
        default_value = "target,node_modules,.git,dist,build"
    )]
    ignore_dirs: String,

    /// Mostrar estadísticas detalladas después del análisis
    #[arg(short, long)]
    stats: bool,

    /// Modo verboso (mostrar más información durante el proceso)
    #[arg(short, long)]
    verbose: bool,
}

fn main() -> Result<()> {
    // Banner de inicio
    print_banner();

    // Parsear argumentos
    let cli = Cli::parse();

    // Validar que el path existe
    if !cli.path.exists() {
        anyhow::bail!("El path especificado no existe: {}", cli.path.display());
    }

    if !cli.path.is_dir() {
        anyhow::bail!("El path debe ser un directorio: {}", cli.path.display());
    }

    // Configurar descubrimiento de ficheros
    let extensions: Vec<String> = cli
        .extensions
        .split(',')
        .map(|s| s.trim().to_string())
        .collect();

    let ignored_dirs: Vec<String> = cli
        .ignore_dirs
        .split(',')
        .map(|s| s.trim().to_string())
        .collect();

    let config = DiscoveryConfig {
        allowed_extensions: extensions,
        max_lines: cli.max_lines,
        ignored_dirs,
    };

    if cli.verbose {
        println!("🔧 Configuración:");
        println!("   • Path: {}", cli.path.display());
        println!("   • Output: {}", cli.output.display());
        println!("   • Max líneas: {}", config.max_lines);
        println!("   • Extensiones: {:?}", config.allowed_extensions);
        println!("   • Directorios ignorados: {:?}", config.ignored_dirs);
        println!();
    }

    // Construir el grafo
    let builder = GraphBuilder::new(file_discovery::FileDiscovery::new(config));
    let graph = builder
        .build(&cli.path)
        .context("Error al construir el grafo del proyecto")?;

    // Escribir a fichero
    GraphWriter::write_to_file(&graph, &cli.output)
        .context("Error al escribir el grafo a fichero")?;

    // Mostrar estadísticas si se solicitó
    if cli.stats {
        println!("\n{}", GraphWriter::generate_stats(&graph));
    }

    println!("\n🎉 ¡Generación completada exitosamente!");
    println!("   Grafo guardado en: {}", cli.output.display());

    Ok(())
}

fn print_banner() {
    println!(
        r#"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ██████╗ ███╗   ███╗ ██████╗  █████╗                         ║
║  ██╔════╝ ████╗ ████║██╔════╝ ██╔══██╗                        ║
║  ██║  ███╗██╔████╔██║██║  ███╗███████║                        ║
║  ██║   ██║██║╚██╔╝██║██║   ██║██╔══██║                        ║
║  ╚██████╔╝██║ ╚═╝ ██║╚██████╔╝██║  ██║                        ║
║   ╚═════╝ ╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═╝                        ║
║                                                               ║
║   Generador de Mapa de Grafo Arquitectónico                   ║
║   Graph Map Generator Architecture v{}                        ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
"#,
        env!("CARGO_PKG_VERSION")
    );
}
