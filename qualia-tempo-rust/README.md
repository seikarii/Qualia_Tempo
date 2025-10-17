# Qualia Tempo - Rust Edition

**A rhythm-action music boss rush game where every action generates Qualia**

## Overview

Qualia Tempo is a complete rewrite of the original TypeScript/Python prototype in pure Rust, targeting production-grade performance, safety, and maintainability. This implementation leverages Rust's zero-cost abstractions, fearless concurrency, and unified backend/frontend architecture (via WebAssembly).

## Architecture

- **Backend**: Pure Rust server with Tokio async runtime, Axum web framework, and WebSocket support
- **Frontend**: Rust compiled to WebAssembly using Leptos (reactive UI), wgpu (graphics), and Web Audio
- **Shared Core**: Contract definitions and trait interfaces shared between frontend and backend
- **Procedural Macros**: Custom macros for event handling, caching, validation, and more

## Project Structure

```
qualia-tempo-rust/
├── shared_core/     # Shared contracts, traits, events, utilities
├── backend/         # Server binary (game logic, AI, networking)
├── frontend/        # WASM client (rendering, audio, input)
└── qualia_macros/   # Custom procedural macros
```

## Building

### Prerequisites

- Rust 1.75+ (install via [rustup](https://rustup.rs/))
- For frontend: `wasm-pack` and `trunk`

### Build Commands

```bash
# Build entire workspace
cargo build

# Build release (optimized)
cargo build --release

# Run tests
cargo test --workspace

# Run clippy (linter)
cargo clippy --workspace --all-targets -- -D warnings

# Build frontend WASM
cd frontend && trunk build --release
```

## Development

### Running the Backend

```bash
cd backend
cargo run
```

The server will start on `http://localhost:3000` with WebSocket support at `/ws`.

### Running the Frontend

```bash
cd frontend
trunk serve
```

The client will be available at `http://localhost:8080`.

## Documentation

- **Architecture**: See `/docs/ARCHITECTURE.RUST.v2.0.md`
- **Coding Standards**: See `/docs/QUALIA.CODE.RUST.md`
- **Implementation Guide**: See `/docs/QUALIA.MANUAL.RUST.md`
- **Migration Blueprint**: See `/docs/BLUEPRINT.RUST.md`
- **Data Contracts**: See `/docs/DATA.RUST.md`

## Compliance

This project strictly adheres to:
- QUALIA.CODE.RUST v1.1 (architectural laws)
- ARCHITECTURE.RUST v2.0 (system design)
- BLUEPRINT.RUST v2.0 (service catalog)

## License

See LICENSE file in the root directory.

## Contributing

All contributions must follow the architectural principles defined in the documentation. See PLAN.md for the implementation roadmap.
