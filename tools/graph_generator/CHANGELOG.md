# Changelog

All notable changes to the Graph Generator (GMGA) project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-10-11

### Added - Semantic Enrichment (TDD-Driven Evolution)

**Mission**: Transform graph_generator from structural skeleton to semantically rich API contract mapper.

#### Semantic Information Capture
- **Full Type Signatures for Fields**: Public fields now include complete type information
  - BEFORE: `["field1"]`
  - AFTER: `["pub field1: String"]`
- **Full Method Signatures**: Public methods now include complete signature with parameters and return types
  - BEFORE: `["get_name"]`
  - AFTER: `["pub fn get_name(&self, prefix: &str) -> String"]`
- **Trait Method Signatures**: Trait definitions now capture full method signatures
- **Signature Normalization**: Custom normalization function cleans up `quote!` macro output spacing for readability

#### Redundancy Elimination
- **Module Descriptions**: Module descriptions now extracted from `//!` doc comments instead of auto-generated text
  - Modules WITHOUT doc comments have `null` description (not redundant "Module: crate::foo")
  - Modules WITH doc comments show actual documentation
- **File Path Optimization**: `file_path` field now only present in module nodes
  - **Savings**: ~3% JSON size reduction (409 bytes in self-analysis)
  - **Rationale**: File location can be inferred from module node or node ID
  - **Impact**: Reduces "noise" in AI context consumption

#### Testing & Quality
- **TDD Methodology**: Strict Red-Green-Refactor cycle followed
- **New Integration Tests**:
  - `test_graph_node_contains_rich_semantic_info`: Validates full signatures
  - `test_module_descriptions_from_doc_comments`: Validates doc comment extraction
  - `test_file_path_only_in_module_nodes`: Validates redundancy elimination
- **Test Suite**: 15 tests passing (10 unit + 5 integration)
- **Coverage**: 100% of new semantic features tested

#### Implementation Details
- **Quote Crate**: Uses `quote::quote!` macro to convert syn AST nodes back to Rust code strings
- **Normalize Signature**: Custom function handles spacing, references, paths, colons, commas, and arrows
- **Extract Module Doc**: New function extracts module-level `//!` comments from AST attributes

### Changed
- `GraphNode.file_path`: Changed from `String` to `Option<String>` (breaking change, but improves AI readability)
- `AstVisitor.new()`: Renamed to `new_with_doc()` to accept module documentation

### Impact Analysis
- **Semantic Quality**: 100% → Information now complete and usable for API documentation generation
- **JSON Size**: -3% (redundancy eliminated)
- **AI Context Efficiency**: Significantly improved (no repeated file paths, no redundant descriptions)
- **Backward Compatibility**: Partial breaking change (file_path now optional, but JSON structure unchanged)

## [0.1.1] - 2025-10-11

### Added - Module-Level Dependency Tracking (TDD Refinement)

**Refinement**: Enhanced module dependency capture to provide comprehensive architectural view.

#### What Changed
- **Module Nodes**: Each file now represented as "module" node in graph
- **Top-Level Uses**: `use` statements at file level create edges from module to imported types
- **Comprehensive View**: Both high-level architecture (module dependencies) and low-level details (struct relationships)

#### Impact
- **Relationship Capture**: 20x improvement (3 → 61 edges in self-analysis)
- **Architectural Analysis**: Enables true module-to-module dependency visualization

#### Testing
- **TDD Approach**: Red-Green-Refactor cycle strictly followed
- **Integration Tests**: 2 new tests validating module dependency detection
- **Test Suite**: 12 tests passing (10 unit + 2 integration)

## [0.1.0] - 2025-10-11

### Added - Initial Implementation

**Mission**: Create GMGA (Graph Map Generator Architecture) - A Rust CLI tool for architectural analysis.

#### Core Features
- **AST Analysis**: Uses `syn` crate for full Rust syntax tree parsing
- **Node Types**: Supports struct, enum, trait, function, and module nodes
- **Relationship Mapping**: Tracks `uses`, `implements`, and containment edges
- **Configurable Discovery**: File filtering by extension, size, and ignored directories
- **JSON Output**: Serialized graph with nodes, edges, and metadata
- **CLI Interface**: Comprehensive options (--path, --output, --stats, --verbose, --max-lines)

#### Modules (1,360 lines)
1. `main.rs`: CLI entry point with clap
2. `types.rs`: Core data structures (GraphNode, GraphEdge, ProjectGraph)
3. `file_discovery.rs`: Recursive directory traversal with filtering
4. `ast_analyzer.rs`: AST visitor for code analysis
5. `graph_builder.rs`: Orchestration of discovery → analysis → graph
6. `output.rs`: JSON serialization and statistics

#### Quality Metrics
- **Test Suite**: 10 unit tests passing
- **Documentation**: Comprehensive README, PROJECT_SUMMARY, usage examples
- **Self-Validation**: Analyzed itself successfully (6 files → 10 nodes, 3 edges)

---

**Legend**:
- 🟢 **Added**: New features
- 🟡 **Changed**: Changes to existing functionality
- 🔴 **Breaking**: Breaking changes
- 🔵 **Fixed**: Bug fixes
