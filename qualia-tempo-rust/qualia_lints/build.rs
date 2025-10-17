//! # Responsibility
//! Build-time architectural enforcement for NO_INLINE_TESTS rule.
//!
//! ---
//!
//! This build script scans the workspace for inline test violations
//! and FAILS THE BUILD if any are found. Runs automatically on `cargo build`.

use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process;

fn main() {
    println!("cargo:rerun-if-changed=../shared_core/src");
    println!("cargo:rerun-if-changed=../backend/src");
    println!("cargo:rerun-if-changed=../frontend/src");
    
    let workspace_root = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap())
        .parent()
        .unwrap()
        .to_path_buf();
    
    let mut violations = Vec::new();
    
    // Scan shared_core
    scan_crate(&workspace_root.join("shared_core/src"), &mut violations);
    
    // Scan backend
    scan_crate(&workspace_root.join("backend/src"), &mut violations);
    
    // Scan frontend  
    scan_crate(&workspace_root.join("frontend/src"), &mut violations);
    
    if !violations.is_empty() {
        eprintln!("\n╔════════════════════════════════════════════════════════════════╗");
        eprintln!("║  ❌ ARCHITECTURAL VIOLATION: NO_INLINE_TESTS                  ║");
        eprintln!("╚════════════════════════════════════════════════════════════════╝\n");
        
        for (file, line) in &violations {
            eprintln!("\x1b[31merror\x1b[0m: Módulo de test inline prohibido por la arquitectura de Qualia Tempo.");
            eprintln!("  \x1b[33m-->\x1b[0m {}:{}:1", file.display(), line);
            eprintln!("   |");
            eprintln!("   | \x1b[33m#[cfg(test)]\x1b[0m");
            eprintln!("   | ^^^^^^^^^^^^ Los tests deben residir en directorios 'tests/' dedicados.");
            eprintln!("   |");
            eprintln!("   = \x1b[33mhelp\x1b[0m: Para mantener una separación estricta entre el código de producción y las pruebas,");
            eprintln!("           mueva este módulo de test a un archivo de integración en el directorio 'tests/' de su crate.");
            eprintln!("   = \x1b[33mnote\x1b[0m: Siga el patrón de 'Contenedor Aislado' definido en QUALIA.CODE.RUST.md, utilizando");
            eprintln!("           factorías de módulos de test y mocks de alta fidelidad con 'mockall' para asegurar");
            eprintln!("           tests robustos y desacoplados.\n");
        }
        
        eprintln!("\x1b[31m✗\x1b[0m Found {} inline test violation(s).", violations.len());
        eprintln!("\nBuild FAILED due to architectural violations.");
        eprintln!("Compliance: QUALIA.CODE.RUST §3.2 (Testing Architecture)\n");
        
        process::exit(1);
    }
    
    println!("cargo:warning=✓ NO_INLINE_TESTS: All tests properly isolated");
}

fn scan_crate(src_dir: &Path, violations: &mut Vec<(PathBuf, usize)>) {
    if !src_dir.exists() {
        return;
    }
    
    scan_directory(src_dir, violations);
}

fn scan_directory(dir: &Path, violations: &mut Vec<(PathBuf, usize)>) {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            
            if path.is_dir() {
                // Skip tests/ directories
                if path.file_name().and_then(|n| n.to_str()) == Some("tests") {
                    continue;
                }
                scan_directory(&path, violations);
            } else if path.extension().and_then(|e| e.to_str()) == Some("rs") {
                // Skip lib.rs and main.rs (integration test harnesses)
                if let Some(filename) = path.file_name().and_then(|n| n.to_str()) {
                    if filename == "lib.rs" || filename == "main.rs" {
                        continue;
                    }
                }
                
                check_file(&path, violations);
            }
        }
    }
}

fn check_file(path: &Path, violations: &mut Vec<(PathBuf, usize)>) {
    if let Ok(content) = fs::read_to_string(path) {
        for (line_num, line) in content.lines().enumerate() {
            let trimmed = line.trim();
            if trimmed == "#[cfg(test)]" {
                violations.push((path.to_path_buf(), line_num + 1));
                return; // Only report first occurrence per file
            }
        }
    }
}
