//! Integration tests for graph_generator
//!
//! These tests verify end-to-end behavior by creating real file structures
//! and validating the generated graph JSON output.

use std::fs::{self, File};
use std::io::Write;
use std::path::PathBuf;
use std::process::Command;
use tempfile::tempdir;

/// Helper to get the path to the compiled graph_generator binary
fn get_binary_path() -> PathBuf {
    let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path.push("target");
    path.push("debug");
    path.push("graph_generator");
    path
}

/// Helper to ensure the binary is compiled
fn ensure_binary_compiled() {
    let binary_path = get_binary_path();
    if !binary_path.exists() {
        panic!(
            "Binary not found at {:?}. Run 'cargo build' first.",
            binary_path
        );
    }
}

#[test]
fn test_graph_generates_correct_module_dependencies() {
    // ARRANGE: Create a realistic Rust project structure
    let temp_dir = tempdir().expect("Failed to create temp dir");
    let src_dir = temp_dir.path().join("src");
    fs::create_dir(&src_dir).expect("Failed to create src dir");

    // Create lib.rs with module declaration and use statement
    let lib_path = src_dir.join("lib.rs");
    let mut lib_file = File::create(&lib_path).expect("Failed to create lib.rs");
    writeln!(
        lib_file,
        r#"
//! Library root module

pub mod services;

use services::MyService;

pub fn create_service() -> MyService {{
    MyService::new()
}}
"#
    )
    .expect("Failed to write lib.rs");

    // Create services/mod.rs
    let services_dir = src_dir.join("services");
    fs::create_dir(&services_dir).expect("Failed to create services dir");
    let services_mod_path = services_dir.join("mod.rs");
    let mut services_file =
        File::create(&services_mod_path).expect("Failed to create services/mod.rs");
    writeln!(
        services_file,
        r#"
//! Services module

pub struct MyService {{
    name: String,
}}

impl MyService {{
    pub fn new() -> Self {{
        Self {{
            name: "MyService".to_string(),
        }}
    }}
}}
"#
    )
    .expect("Failed to write services/mod.rs");

    // Flush and close files
    drop(lib_file);
    drop(services_file);

    // ACT: Run graph_generator on the temporary project
    ensure_binary_compiled();
    let binary_path = get_binary_path();
    let output_path = temp_dir.path().join("project_graph.json");

    let output = Command::new(&binary_path)
        .arg("--path")
        .arg(&src_dir)
        .arg("--output")
        .arg(&output_path)
        .output()
        .expect("Failed to execute graph_generator");

    if !output.status.success() {
        panic!(
            "graph_generator failed:\nstdout: {}\nstderr: {}",
            String::from_utf8_lossy(&output.stdout),
            String::from_utf8_lossy(&output.stderr)
        );
    }

    // ASSERT: Read and validate the generated JSON
    let json_content =
        fs::read_to_string(&output_path).expect("Failed to read generated JSON");
    let graph: serde_json::Value =
        serde_json::from_str(&json_content).expect("Failed to parse JSON");

    // Verify the graph structure
    assert!(
        graph.get("nodes").is_some(),
        "Graph should have 'nodes' field"
    );
    assert!(
        graph.get("edges").is_some(),
        "Graph should have 'edges' field"
    );

    let edges = graph["edges"]
        .as_array()
        .expect("'edges' should be an array");

    // CRITICAL ASSERTION: Verify module-to-module dependency exists
    // We expect an edge from "crate" (lib.rs) to "crate::services"
    // representing the "use services::MyService;" statement
    let module_dependency_exists = edges.iter().any(|edge| {
        let source = edge["source"].as_str().unwrap_or("");
        let target = edge["target"].as_str().unwrap_or("");
        let label = edge["label"].as_str().unwrap_or("");

        // The source should be the root module (crate or crate::lib)
        let is_root_source = source == "crate" || source == "crate::lib";
        
        // The target should be the services module or MyService
        let is_services_target = target.contains("services");
        
        // The label should be "uses"
        let is_uses = label == "uses";

        is_root_source && is_services_target && is_uses
    });

    assert!(
        module_dependency_exists,
        "Expected to find an edge representing the module dependency from lib.rs to services module.\n\
         Edges found: {:#?}\n\
         This edge should have:\n\
         - source: 'crate' or 'crate::lib'\n\
         - target: containing 'services'\n\
         - label: 'uses'\n\
         \n\
         If this assertion fails, it means the graph_generator is not correctly \
         capturing module-level use statements.",
        edges
    );

    // Additional verification: Check that nodes exist for both modules
    let nodes = graph["nodes"]
        .as_array()
        .expect("'nodes' should be an array");

    let has_lib_node = nodes.iter().any(|node| {
        let id = node["id"].as_str().unwrap_or("");
        id == "crate" || id == "crate::lib"
    });

    let has_services_node = nodes.iter().any(|node| {
        let id = node["id"].as_str().unwrap_or("");
        id.contains("services")
    });

    assert!(
        has_lib_node,
        "Expected to find a node representing the lib.rs module"
    );
    assert!(
        has_services_node,
        "Expected to find a node representing the services module"
    );

    println!("✅ Integration test passed: Module dependencies correctly captured");
}

#[test]
fn test_graph_captures_nested_module_structure() {
    // ARRANGE: Create a more complex nested structure
    let temp_dir = tempdir().expect("Failed to create temp dir");
    let src_dir = temp_dir.path().join("src");
    fs::create_dir(&src_dir).expect("Failed to create src dir");

    // Create lib.rs
    let lib_path = src_dir.join("lib.rs");
    let mut lib_file = File::create(&lib_path).expect("Failed to create lib.rs");
    writeln!(
        lib_file,
        r#"
pub mod utils;
pub mod core;

use core::Engine;
"#
    )
    .expect("Failed to write lib.rs");

    // Create utils/mod.rs
    let utils_dir = src_dir.join("utils");
    fs::create_dir(&utils_dir).expect("Failed to create utils dir");
    let utils_mod = utils_dir.join("mod.rs");
    let mut utils_file = File::create(&utils_mod).expect("Failed to create utils/mod.rs");
    writeln!(utils_file, "pub fn helper() {{}}").expect("Failed to write utils/mod.rs");

    // Create core/mod.rs
    let core_dir = src_dir.join("core");
    fs::create_dir(&core_dir).expect("Failed to create core dir");
    let core_mod = core_dir.join("mod.rs");
    let mut core_file = File::create(&core_mod).expect("Failed to create core/mod.rs");
    writeln!(
        core_file,
        r#"
use crate::utils;

pub struct Engine;
"#
    )
    .expect("Failed to write core/mod.rs");

    drop(lib_file);
    drop(utils_file);
    drop(core_file);

    // ACT: Run graph_generator
    ensure_binary_compiled();
    let binary_path = get_binary_path();
    let output_path = temp_dir.path().join("project_graph.json");

    let output = Command::new(&binary_path)
        .arg("--path")
        .arg(&src_dir)
        .arg("--output")
        .arg(&output_path)
        .output()
        .expect("Failed to execute graph_generator");

    assert!(
        output.status.success(),
        "graph_generator should succeed on nested structure"
    );

    // ASSERT: Verify nested dependencies
    let json_content =
        fs::read_to_string(&output_path).expect("Failed to read generated JSON");
    let graph: serde_json::Value =
        serde_json::from_str(&json_content).expect("Failed to parse JSON");

    let edges = graph["edges"]
        .as_array()
        .expect("'edges' should be an array");

    // Should have dependency from lib -> core
    let lib_to_core = edges.iter().any(|edge| {
        let source = edge["source"].as_str().unwrap_or("");
        let target = edge["target"].as_str().unwrap_or("");
        source.contains("crate") && target.contains("core") && edge["label"] == "uses"
    });

    // Should have dependency from core -> utils
    let core_to_utils = edges.iter().any(|edge| {
        let source = edge["source"].as_str().unwrap_or("");
        let target = edge["target"].as_str().unwrap_or("");
        source.contains("core") && target.contains("utils") && edge["label"] == "uses"
    });

    assert!(
        lib_to_core,
        "Expected dependency from lib to core module"
    );
    assert!(
        core_to_utils,
        "Expected dependency from core to utils module"
    );

    println!("✅ Integration test passed: Nested module structure correctly captured");
}
