# CHANGELOG - Graph Generator

## [0.2.0] - 2025-10-13

### 🚀 MAJOR: Multi-Language Support

#### Added
- **TypeScript Support** (.ts, .tsx)
  - Parser: `tree-sitter-typescript v0.21`
  - Extracts: interfaces, classes, functions, imports, exports
  - Full heritage tracking (extends/implements)

- **Python Support** (.py)
  - Parser: `tree-sitter-python v0.21`
  - Extracts: classes, functions, decorators, imports
  - Detects private members (underscore prefix)

- **Automatic Language Detection**
  - Based on file extension
  - New `Language` enum: Rust, TypeScript, Python

- **Unified Architecture**
  - `LanguageAnalyzer` trait for extensibility
  - `language_analyzers/` module structure:
    - `mod.rs` - trait definition
    - `rust_analyzer.rs` - refactored from original
    - `typescript_analyzer.rs` - tree-sitter implementation
    - `python_analyzer.rs` - tree-sitter implementation

#### Changed
- **Default Extensions**: Now `rs,ts,tsx,py` instead of just `rs`
- **AstAnalyzer**: Refactored to orchestrator pattern, delegates to language-specific analyzers
- **DiscoveredFile**: Added `language: Language` field
- **GraphNode**: Added `metadata` with "language" key

#### Dependencies Added
```toml
tree-sitter = "0.22"
tree-sitter-typescript = "0.21"
tree-sitter-python = "0.21"
regex = "1.10"
```

#### Testing
- ✅ 11 unit tests passing
- ✅ 5 integration tests passing
- ✅ Real-world validation:
  - **Rust**: 11 files → 26 nodes, 108 edges
  - **TypeScript**: 317 files → 808 nodes, 1750 edges
  - **Multi-lang**: 877 files → 1784 nodes, 4508 edges

#### Documentation
- Added `README_MULTILANG.md` with:
  - Language comparison table
  - Usage examples per language
  - Architecture diagrams
  - CLI options reference

---

## [0.1.0] - Initial Release

### Added
- Rust-only AST analysis using `syn`
- Graph generation with nodes (structs, enums, traits, functions)
- Dependency tracking via `use` statements
- JSON serialization
- CLI with configurable options
- Module path inference
- Integration tests
