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

#[test]
fn test_graph_node_contains_rich_semantic_info() {
    // ARRANGE: Create a test file with full semantic information
    let temp_dir = tempdir().expect("Failed to create temp dir");
    let src_dir = temp_dir.path().join("src");
    fs::create_dir(&src_dir).expect("Failed to create src dir");

    let lib_path = src_dir.join("lib.rs");
    let mut lib_file = File::create(&lib_path).expect("Failed to create lib.rs");
    writeln!(
        lib_file,
        r#"
/// A test struct for semantic validation
pub struct SemanticTestStruct {{
    pub name: String,
    pub count: usize,
    private_field: i32,
}}

impl SemanticTestStruct {{
    /// Returns the name with a prefix
    pub fn get_name(&self, prefix: &str) -> String {{
        format!("{{}}: {{}}", prefix, self.name)
    }}

    /// Creates a new instance
    pub fn new(name: String) -> Self {{
        Self {{
            name,
            count: 0,
            private_field: 42,
        }}
    }}

    // Private method should not appear
    fn internal_helper(&self) -> i32 {{
        self.private_field
    }}
}}
"#
    )
    .expect("Failed to write lib.rs");

    drop(lib_file);

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

    let nodes = graph["nodes"]
        .as_array()
        .expect("'nodes' should be an array");

    // Find the SemanticTestStruct node
    let struct_node = nodes
        .iter()
        .find(|node| {
            node["id"]
                .as_str()
                .map(|id| id.contains("SemanticTestStruct"))
                .unwrap_or(false)
        })
        .expect("Should find SemanticTestStruct node");

    // CRITICAL ASSERTION 1: public_fields must contain FULL type declarations
    let public_fields = struct_node["public_fields"]
        .as_array()
        .expect("public_fields should be an array");

    // We expect exactly 2 public fields with full type information
    assert_eq!(
        public_fields.len(),
        2,
        "SemanticTestStruct should have exactly 2 public fields"
    );

    // Check for "pub name: String"
    let has_name_field = public_fields.iter().any(|field| {
        let field_str = field.as_str().unwrap_or("");
        field_str.contains("pub") && field_str.contains("name") && field_str.contains("String")
    });

    assert!(
        has_name_field,
        "Expected public_fields to contain full declaration like 'pub name: String'.\n\
         Found: {:?}\n\
         The field declaration must include:\n\
         - Visibility modifier (pub)\n\
         - Field name (name)\n\
         - Type annotation (: String)",
        public_fields
    );

    // Check for "pub count: usize"
    let has_count_field = public_fields.iter().any(|field| {
        let field_str = field.as_str().unwrap_or("");
        field_str.contains("pub") && field_str.contains("count") && field_str.contains("usize")
    });

    assert!(
        has_count_field,
        "Expected public_fields to contain full declaration like 'pub count: usize'.\n\
         Found: {:?}",
        public_fields
    );

    // CRITICAL ASSERTION 2: public_methods must contain FULL signatures
    let public_methods = struct_node["public_methods"]
        .as_array()
        .expect("public_methods should be an array");

    // We expect exactly 2 public methods (get_name and new)
    assert_eq!(
        public_methods.len(),
        2,
        "SemanticTestStruct should have exactly 2 public methods"
    );

    // Check for "pub fn get_name(&self, prefix: &str) -> String"
    let has_get_name_method = public_methods.iter().any(|method| {
        let method_str = method.as_str().unwrap_or("");
        method_str.contains("pub")
            && method_str.contains("fn")
            && method_str.contains("get_name")
            && method_str.contains("&self")
            && method_str.contains("prefix")
            && method_str.contains("&str")
            && method_str.contains("->")
            && method_str.contains("String")
    });

    assert!(
        has_get_name_method,
        "Expected public_methods to contain full signature like 'pub fn get_name(&self, prefix: &str) -> String'.\n\
         Found: {:?}\n\
         The method signature must include:\n\
         - Visibility modifier (pub)\n\
         - Function keyword (fn)\n\
         - Method name (get_name)\n\
         - Parameters (&self, prefix: &str)\n\
         - Return type (-> String)",
        public_methods
    );

    // Check for "pub fn new(name: String) -> Self"
    let has_new_method = public_methods.iter().any(|method| {
        let method_str = method.as_str().unwrap_or("");
        method_str.contains("pub")
            && method_str.contains("fn")
            && method_str.contains("new")
            && method_str.contains("name")
            && method_str.contains("String")
            && method_str.contains("->")
            && method_str.contains("Self")
    });

    assert!(
        has_new_method,
        "Expected public_methods to contain full signature like 'pub fn new(name: String) -> Self'.\n\
         Found: {:?}",
        public_methods
    );

    // Additional check: private method should NOT be included
    let has_private_method = public_methods.iter().any(|method| {
        let method_str = method.as_str().unwrap_or("");
        method_str.contains("internal_helper")
    });

    assert!(
        !has_private_method,
        "Private methods should not be included in public_methods"
    );

    println!("✅ Integration test passed: Rich semantic information correctly captured");
}

#[test]
fn test_module_descriptions_from_doc_comments() {
    // ARRANGE: Create files with module-level doc comments
    let temp_dir = tempdir().expect("Failed to create temp dir");
    let src_dir = temp_dir.path().join("src");
    fs::create_dir(&src_dir).expect("Failed to create src dir");

    // File WITH module doc comment
    let lib_path = src_dir.join("lib.rs");
    let mut lib_file = File::create(&lib_path).expect("Failed to create lib.rs");
    writeln!(
        lib_file,
        r#"
//! This is the main library module
//! It provides core functionality

pub struct MyStruct;
"#
    )
    .expect("Failed to write lib.rs");

    // File WITHOUT module doc comment
    let utils_dir = src_dir.join("utils.rs");
    let mut utils_file = File::create(&utils_dir).expect("Failed to create utils.rs");
    writeln!(
        utils_file,
        r#"
pub struct UtilStruct;
"#
    )
    .expect("Failed to write utils.rs");

    drop(lib_file);
    drop(utils_file);

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

    let nodes = graph["nodes"]
        .as_array()
        .expect("'nodes' should be an array");

    // Find the lib module node
    let lib_module = nodes
        .iter()
        .find(|node| {
            node["type"] == "module"
                && node["id"]
                    .as_str()
                    .map(|id| id == "crate" || id == "crate::lib")
                    .unwrap_or(false)
        })
        .expect("Should find lib module node");

    // CRITICAL ASSERTION 1: Module WITH doc comment should have meaningful description
    assert!(
        lib_module.get("description").is_some(),
        "lib module should have a description field"
    );

    let lib_description = lib_module["description"].as_str();
    assert!(
        lib_description.is_some(),
        "lib module should have a non-null description"
    );

    let lib_desc_text = lib_description.unwrap();
    assert!(
        lib_desc_text.contains("main library module") || lib_desc_text.contains("core functionality"),
        "lib module description should contain actual doc comment content, not auto-generated text.\n\
         Found: '{}'",
        lib_desc_text
    );

    // Should NOT contain redundant auto-generated text
    assert!(
        !lib_desc_text.contains("Module: crate"),
        "Module description should not contain redundant auto-generated text 'Module: crate'.\n\
         Found: '{}'",
        lib_desc_text
    );

    // Find the utils module node
    let utils_module = nodes
        .iter()
        .find(|node| {
            node["type"] == "module"
                && node["id"]
                    .as_str()
                    .map(|id| id.contains("utils"))
                    .unwrap_or(false)
        })
        .expect("Should find utils module node");

    // CRITICAL ASSERTION 2: Module WITHOUT doc comment should have null/missing description
    // (not auto-generated text)
    let utils_description = utils_module.get("description");
    
    // Either description is missing (field not present) or it's null
    let has_no_description = utils_description.is_none() 
        || utils_description.unwrap().is_null();
    
    assert!(
        has_no_description,
        "Module without doc comments should have null description, not auto-generated text.\n\
         Found: {:?}",
        utils_description
    );

    println!("✅ Integration test passed: Module descriptions correctly extracted from //! comments");
}

#[test]
fn test_file_path_only_in_module_nodes() {
    // ARRANGE: Create a simple project
    let temp_dir = tempdir().expect("Failed to create temp dir");
    let src_dir = temp_dir.path().join("src");
    fs::create_dir(&src_dir).expect("Failed to create src dir");

    let lib_path = src_dir.join("lib.rs");
    let mut lib_file = File::create(&lib_path).expect("Failed to create lib.rs");
    writeln!(
        lib_file,
        r#"
//! Test library

pub struct TestStruct {{
    pub field: String,
}}

pub enum TestEnum {{
    Variant1,
}}

pub trait TestTrait {{
    fn method(&self);
}}
"#
    )
    .expect("Failed to write lib.rs");

    drop(lib_file);

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

    let nodes = graph["nodes"]
        .as_array()
        .expect("'nodes' should be an array");

    // Count module nodes and non-module nodes
    let mut module_nodes_with_path = 0;
    let mut non_module_nodes_with_path = 0;
    let mut total_module_nodes = 0;
    let mut total_non_module_nodes = 0;

    for node in nodes {
        let node_type = node["type"].as_str().unwrap_or("");
        let has_file_path = node.get("file_path").is_some() 
            && !node["file_path"].is_null();

        if node_type == "module" {
            total_module_nodes += 1;
            if has_file_path {
                module_nodes_with_path += 1;
            }
        } else {
            total_non_module_nodes += 1;
            if has_file_path {
                non_module_nodes_with_path += 1;
            }
        }
    }

    // CRITICAL ASSERTION 1: ALL module nodes MUST have file_path
    assert_eq!(
        module_nodes_with_path,
        total_module_nodes,
        "All module nodes must have file_path field"
    );

    // CRITICAL ASSERTION 2: NO non-module nodes should have file_path (to reduce redundancy)
    assert_eq!(
        non_module_nodes_with_path,
        0,
        "Non-module nodes (struct, enum, trait, function) should NOT have file_path field.\n\
         This is redundant information that wastes AI context.\n\
         The file can be inferred from the module node or from the node ID.\n\
         Found {} non-module nodes with file_path out of {} total.",
        non_module_nodes_with_path,
        total_non_module_nodes
    );

    println!("✅ Integration test passed: file_path only present in module nodes (redundancy eliminated)");
    println!("   Module nodes: {} (all with file_path)", total_module_nodes);
    println!("   Non-module nodes: {} (none with file_path)", total_non_module_nodes);
}
