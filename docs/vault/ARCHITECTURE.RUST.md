# ARCHITECTURE.RUST v1.0 - Complete System Design
# TARGET: Qualia Tempo Rust Rewrite
# COMPLIANCE: QUALIA.CODE.RUST + GOLD.CODE principles

---

## 1. EXECUTIVE SUMMARY

Qualia Tempo Rust Edition is a complete rewrite that leverages Rust's strengths for maximum performance, safety, and maintainability. The architecture maintains GOLD.CODE's separation of concerns while unifying the stack under a single language.

### Key Architectural Decisions

1. **Unified Language**: Backend AND frontend in Rust (WebAssembly for browser)
2. **Compile-Time Safety**: Type system catches errors before runtime
3. **Zero-Copy Communication**: Shared memory for contracts, minimal serialization
4. **Lock-Free Concurrency**: Async/await with Tokio, no thread blocking
5. **WebGPU First**: wgpu for modern graphics API, runs native + WASM
6. **Direct Configuration**: Serde-based config injection, no runtime lookups

---

## 2. SYSTEM ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                               BROWSER (CLIENT)                                   │
│                                                                                   │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │                      WASM MODULE (Rust → WebAssembly)                      │  │
│  │                                                                            │  │
│  │  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────────────┐   │  │
│  │  │  Leptos UI      │  │  wgpu Renderer   │  │  Web Audio Bridge     │   │  │
│  │  │  (Components)   │  │  (WebGPU)        │  │  (via wasm-bindgen)   │   │  │
│  │  │                 │  │                  │  │                       │   │  │
│  │  │ • GameUI        │  │ • ParticleSys    │  │ • FFTAnalyzer         │   │  │
│  │  │ • QualiaDisplay │  │ • PostProcess    │  │ • AudioPlayback       │   │  │
│  │  │ • BossRenderer  │  │ • ShaderManager  │  │ • 8D Positioning      │   │  │
│  │  └────────┬────────┘  └────────┬─────────┘  └──────────┬────────────┘   │  │
│  │           │                    │                        │                │  │
│  │           └────────────────────┴────────────────────────┘                │  │
│  │                                │                                         │  │
│  │  ┌─────────────────────────────▼──────────────────────────────────────┐  │  │
│  │  │                     Frontend Event Bus                             │  │  │
│  │  │                  (tokio::sync::broadcast, in-WASM)                 │  │  │
│  │  └─────────────────────────────┬──────────────────────────────────────┘  │  │
│  │                                │                                         │  │
│  │  ┌─────────────────────────────▼──────────────────────────────────────┐  │  │
│  │  │                   WebSocket Client                                  │  │  │
│  │  │                 (tokio-tungstenite WASM)                            │  │  │
│  │  └─────────────────────────────┬──────────────────────────────────────┘  │  │
│  │                                │                                         │  │
│  └────────────────────────────────┼─────────────────────────────────────────┘  │
│                                   │                                            │
└───────────────────────────────────┼────────────────────────────────────────────┘
                                    │ WebSocket (Binary Protocol)
                                    │ Serialized with bincode/msgpack
┌───────────────────────────────────▼────────────────────────────────────────────┐
│                            BACKEND (Rust Binary)                                │
│                                                                                  │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                         Axum HTTP/WebSocket Server                        │  │
│  │                              (Tokio Runtime)                              │  │
│  └──────────────────────────────────┬────────────────────────────────────────┘  │
│                                     │                                           │
│  ┌──────────────────────────────────▼────────────────────────────────────────┐  │
│  │              Backend Event Bus (tokio::sync::broadcast)                │  │
│  │                    ⚡ Zero-contention, lock-free ⚡                    │  │
│  └───┬──────────────────┬──────────────────┬──────────────────┬─────────────┘  │
│      │                  │                  │                  │                 │
│  ┌───▼────────────┐ ┌───▼────────────┐ ┌───▼────────────┐ ┌──▼──────────────┐  │
│  │ GameLogic      │ │ BossAI         │ │ Harmony        │ │ Particle        │  │
│  │ Service        │ │ Service        │ │ Analysis       │ │ Engine Pool     │  │
│  │                │ │                │ │ Service        │ │                 │  │
│  │ • Combo        │ │ • Pattern      │ │ • Chord        │ │ • Rayon threads │  │
│  │ • Score        │ │   Selection    │ │   Detection    │ │ • Arena alloc   │  │
│  │ • Health       │ │ • Phase Logic  │ │ • Scale Check  │ │ • Zero-copy     │  │
│  └────────────────┘ └────────────────┘ └────────────────┘ └─────────────────┘  │
│                                     │                                           │
│  ┌──────────────────────────────────▼────────────────────────────────────────┐  │
│  │                      State Aggregator Service                             │  │
│  │          (Collects partial states → complete GameState)                   │  │
│  └──────────────────────────────────┬────────────────────────────────────────┘  │
│                                     │                                           │
│  ┌──────────────────────────────────▼────────────────────────────────────────┐  │
│  │                   Persistence Service (Optional)                          │  │
│  │                   (Save/Load leaderboards, replays)                       │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────┐
│                            SHARED CORE (Library Crate)                            │
│                          (Compiled into BOTH frontend & backend)                  │
│                                                                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌───────────────────────────────┐   │
│  │   Contracts     │  │     Events      │  │       Trait Interfaces        │   │
│  │                 │  │                 │  │                               │   │
│  │ • QualiaState   │  │ • GameEvent     │  │ • ILogger                     │   │
│  │ • PlayerAction  │  │ • PlayerAction  │  │ • IGameLogicService           │   │
│  │ • GameState     │  │ • BossAttack    │  │ • IEventBus                   │   │
│  │ • BossState     │  │ • AudioBeat     │  │ • (Shared trait definitions)  │   │
│  └─────────────────┘  └─────────────────┘  └───────────────────────────────┘   │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. COMPLETE FOLDER STRUCTURE

```
qualia-tempo-rust/
├── Cargo.toml                          # Workspace manifest
├── Cargo.lock
├── .cargo/
│   └── config.toml                     # Build configuration
├── .github/
│   └── workflows/
│       ├── ci.yml                      # Continuous integration
│       └── deploy.yml                  # Deployment pipeline
├── README.md
├── LICENSE
│
├── shared_core/                        # Shared library (frontend + backend)
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs
│       ├── contracts.rs                # Data structures (QualiaState, etc.)
│       ├── events.rs                   # Event definitions
│       ├── traits.rs                   # Shared trait interfaces
│       └── utils.rs                    # Shared utilities
│
├── backend/                            # Server binary
│   ├── Cargo.toml
│   ├── config.yaml                     # Server configuration
│   ├── Dockerfile                      # Container image
│   └── src/
│       ├── main.rs                     # Entry point
│       ├── config.rs                   # Config loading
│       ├── handlers/                   # HTTP/WebSocket handlers
│       │   ├── mod.rs
│       │   ├── websocket.rs            # WebSocket handler
│       │   └── health.rs               # Health check endpoint
│       ├── services/                   # Business logic services
│       │   ├── mod.rs
│       │   ├── interfaces.rs           # Service trait definitions
│       │   ├── event_bus.rs            # Backend EventBus
│       │   ├── game_logic_service.rs   # Core game logic
│       │   ├── boss_ai_service.rs      # Boss AI behavior
│       │   ├── harmony_analysis_service.rs  # Musical analysis
│       │   ├── particle_engine_service.rs   # Particle calculations
│       │   ├── pattern_system_service.rs    # Attack pattern manager
│       │   ├── persistence_service.rs       # Save/load data
│       │   └── state_aggregator_service.rs  # State collection
│       ├── middleware/                 # Axum middleware
│       │   ├── mod.rs
│       │   ├── auth.rs                 # Authentication (if needed)
│       │   └── logging.rs              # Request logging
│       └── tests/                      # Integration tests
│           ├── websocket_test.rs
│           └── game_logic_test.rs
│
├── frontend/                           # WASM client
│   ├── Cargo.toml
│   ├── index.html                      # HTML entry point
│   ├── style.css                       # Global styles
│   ├── Trunk.toml                      # Trunk build config
│   └── src/
│       ├── lib.rs                      # WASM entry point
│       ├── app.rs                      # Root Leptos app
│       ├── components/                 # UI components
│       │   ├── mod.rs
│       │   ├── game_ui.rs              # Main game container
│       │   ├── qualia_display.rs       # Qualia state visualization
│       │   ├── boss_renderer.rs        # Boss entity display
│       │   ├── input_capture.rs        # Keyboard/mouse input
│       │   ├── status_bar.rs           # Connection/stats bar
│       │   └── menu.rs                 # Menu screens
│       ├── rendering/                  # wgpu rendering system
│       │   ├── mod.rs
│       │   ├── renderer.rs             # Main wgpu renderer
│       │   ├── particle_system.rs      # Particle rendering
│       │   ├── post_process.rs         # Post-processing effects
│       │   ├── shader_manager.rs       # Shader loading/compilation
│       │   └── shaders/                # WGSL shaders
│       │       ├── particle.wgsl
│       │       ├── bloom.wgsl
│       │       └── reaction_diffusion.wgsl
│       ├── audio/                      # Web Audio integration
│       │   ├── mod.rs
│       │   ├── audio_engine.rs         # Audio playback
│       │   ├── fft_analyzer.rs         # Frequency analysis
│       │   └── audio_8d.rs             # 8D positioning
│       ├── websocket/                  # WebSocket client
│       │   ├── mod.rs
│       │   └── client.rs               # WS connection manager
│       ├── state/                      # Client-side state
│       │   ├── mod.rs
│       │   └── game_state.rs           # Local state management
│       └── utils/                      # Frontend utilities
│           ├── mod.rs
│           └── bindings.rs             # JS interop
│
├── qualia_macros/                      # Custom procedural macros
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs
│       ├── validate.rs                 # #[validate] macro
│       ├── cached.rs                   # #[cached] macro
│       └── instrument.rs               # Custom instrumentation
│
├── scripts/                            # Build and utility scripts
│   ├── generate_schemas.rs             # JSON Schema generation
│   ├── build_wasm.sh                   # WASM build script
│   ├── run_dev.sh                      # Development server
│   └── deploy.sh                       # Production deployment
│
├── docs/                               # Documentation
│   ├── QUALIA.CODE.RUST.md             # Architectural laws
│   ├── QUALIA.MANUAL.RUST.md           # Implementation guide
│   ├── ARCHITECTURE.RUST.md            # This file
│   ├── API.md                          # API documentation
│   └── MIGRATION_GUIDE.md              # TypeScript → Rust translation
│
├── tests/                              # Workspace-level tests
│   ├── integration/
│   │   └── full_game_loop.rs
│   └── performance/
│       └── benchmark.rs
│
└── assets/                             # Static assets
    ├── audio/
    │   └── songs/
    ├── shaders/
    │   └── precompiled/
    └── textures/
```

---

## 4. DATA FLOW ARCHITECTURE

### 4.1. Input → Backend → Frontend Flow

```
┌─────────────┐
│   Player    │
│   Input     │
└──────┬──────┘
       │ 1. Key Press / Dash
       ▼
┌─────────────────────────┐
│  Frontend InputCapture  │
│  (Leptos Component)     │
└──────┬──────────────────┘
       │ 2. PlayerAction struct
       ▼
┌─────────────────────────┐
│  WebSocket Client       │
│  (tokio-tungstenite)    │
└──────┬──────────────────┘
       │ 3. Serialized (bincode)
       │
       │ ═══ Network ═══
       │
       ▼
┌─────────────────────────┐
│  Backend WS Handler     │
│  (Axum)                 │
└──────┬──────────────────┘
       │ 4. Deserialize
       ▼
┌─────────────────────────┐
│  Backend EventBus       │
│(tokio::sync::broadcast) │
└──────┬──────────────────┘
       │ 5. Emit PlayerAction event
       ├────────────────────────────┐
       ▼                            ▼
┌──────────────────┐      ┌──────────────────┐
│ GameLogicService │      │  BossAIService   │
│ (Processes)      │      │  (Reacts)        │
└─────┬────────────┘      └──────────────────┘
      │ 6. Calculate new QualiaState
      ▼
┌─────────────────────────┐
│  Backend EventBus       │
│  (Emits updated state)  │
└──────┬──────────────────┘
       │ 7. GameEvent::QualiaStateUpdated
       ▼
┌─────────────────────────┐
│  State Aggregator       │
│  (Collects all changes) │
└──────┬──────────────────┘
       │ 8. Complete GameState
       ▼
┌─────────────────────────┐
│  WebSocket Sender       │
│  (tokio task)           │
└──────┬──────────────────┘
       │ 9. Serialized state
       │
       │ ═══ Network ═══
       │
       ▼
┌─────────────────────────┐
│  Frontend WS Client     │
│  (WASM)                 │
└──────┬──────────────────┘
       │ 10. Deserialize
       ▼
┌─────────────────────────┐
│  Leptos Signal Update   │
│  (Reactive UI)          │
└──────┬──────────────────┘
       ├────────────────────────────┐
       ▼                            ▼
┌──────────────────┐      ┌──────────────────┐
│ QualiaDisplay    │      │  wgpu Renderer   │
│ (Updates bars)   │      │  (Renders scene) │
└──────────────────┘      └──────────────────┘
```

### 4.2. Parallel Computation Flow (Particle System)

```
Backend GameLogicService
        │
        │ New game state calculated
        ▼
┌──────────────────────────────────┐
│  Particle Engine Pool Manager    │
│  (Dynamic thread pool: num_cpus) │
└───┬──────────────────────────────┘
    │ Distribute work
    ├────────────┬────────────┬────────────┐
    ▼            ▼            ▼            ▼
┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐
│Thread│    │Thread│    │Thread│    │Thread│
│  N   │    │  N+1 │    │  N+2 │    │  N+3 │
└───┬──┘    └───┬──┘    └───┬──┘    └───┬──┘
    │ Calculate   │ Calculate   │ Calculate   │ Calculate
    │ particles   │ particles   │ particles   │ particles
    │ 0-M         │ M+1-N       │ N+1-O       │ O+1-P
    └────────────┴────────────┴────────────┘
                    │ Join results
                    ▼
            ┌──────────────────┐
            │  Result Collector │
            │  (Vec<Particle>)  │
            └─────────┬──────────┘
                      │
                      ▼
            ┌──────────────────────┐
            │  State Aggregator    │
            │  (Adds to GameState) │
            └──────────────────────┘
```

**Thread Pool Configuration**:
- Default: `num_cpus::get()` logical cores
- Configurable via `particle_engine.yaml`
- Scales automatically with hardware capabilities

---

## 5. SERVICE CATALOG

### 5.1. Backend Services

| Service | Responsibility | Dependencies | Concurrency Model |
|---------|---------------|--------------|-------------------|
| **EventBusService** | Central event distribution | None | Async (MPMC) |
| **GameLogicService** | Core game rules, scoring | EventBus, Config | Async |
| **BossAIService** | Boss behavior and patterns | EventBus, Config | Async |
| **HarmonyAnalysisService** | Musical chord detection | EventBus, Config | Async |
| **ParticleEngineService** | Particle physics simulation | Config | Parallel (Rayon) |
| **PatternSystemService** | Attack pattern manager | EventBus, Config | Async |
| **StateAggregatorService** | Collects partial states | EventBus | Async |
| **PersistenceService** | Save/load leaderboards | Config, FileSystem | Async I/O |

### 5.2. Frontend Services (in WASM)

| Service | Responsibility | Dependencies | Platform |
|---------|---------------|--------------|----------|
| **WgpuRenderer** | 3D rendering engine | wgpu, GameState | WebGPU |
| **ParticleSystem** | Particle rendering | WgpuRenderer | WebGPU |
| **PostProcessService** | Bloom, blur effects | WgpuRenderer | WebGPU |
| **AudioEngine** | Music playback | Web Audio API | WASM |
| **FFTAnalyzer** | Frequency analysis | Web Audio API | WASM |
| **Audio8DService** | Spatial audio | Web Audio API | WASM |
| **InputCaptureService** | Keyboard/mouse events | DOM | WASM |
| **WebSocketClient** | Backend communication | tokio-tungstenite | WASM |

---

## 6. CONFIGURATION MANAGEMENT

### 6.1. Configuration Files

```
backend/
├── config.yaml                 # Main server config
├── config/
│   ├── game_logic.yaml         # Game rules parameters
│   ├── boss_ai.yaml            # Boss behavior tuning
│   ├── particle_engine.yaml    # Particle system settings
│   └── harmony_analysis.yaml   # Musical analysis config

frontend/
└── public/
    └── config/
        ├── rendering.yaml      # Graphics settings
        ├── audio.yaml          # Audio configuration
        └── input.yaml          # Input mappings
```

### 6.2. Configuration Structs

```rust
// backend/src/config.rs
use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct AppConfig {
    pub server: ServerConfig,
    pub game_logic: GameLogicConfig,
    pub boss_ai: BossAIConfig,
    pub particle_engine: ParticleEngineConfig,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
    pub max_connections: usize,
    pub websocket_ping_interval_secs: u64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct GameLogicConfig {
    pub base_intensity_multiplier: f32,
    pub harmony_threshold: f32,
    pub combo_decay_rate: f32,
    pub max_combo_multiplier: f32,
}

// Load at startup:
// let config = AppConfig::load()?;
// Inject via Shaku into services
```

---

## 7. PERFORMANCE CHARACTERISTICS

### 7.1. Expected Performance Targets

| Metric | Target | Current (TS/Python) | Improvement |
|--------|--------|---------------------|-------------|
| **Particle Update** | < 1ms for 10k particles | 8-12ms | 8-12x faster |
| **State Serialization** | < 0.5ms | 2-3ms | 4-6x faster |
| **Event Bus Latency** | < 0.1ms | 0.3-0.5ms | 3-5x faster |
| **Memory Usage** | < 50MB | 150-200MB | 3-4x reduction |
| **Binary Size (WASM)** | < 2MB (compressed) | N/A (JS bundle: 5MB) | 2.5x smaller |
| **Startup Time** | < 500ms | 1-2s | 2-4x faster |

### 7.2. Optimization Techniques

1. **Arena Allocation**: Use `typed-arena` for particle systems (no GC pressure)
2. **Zero-Copy Deserialization**: `serde` with `#[serde(borrow)]` for hot paths
3. **Inline Everything**: `#[inline]` on small functions, compiler inlines rest
4. **SIMD Optimization**: Use `std::simd` for particle position updates
5. **Profile-Guided Optimization**: Build with PGO for 15% performance boost
6. **Binary Serialization**: Use `bincode` or `msgpack` instead of JSON (3-5x faster)

---

## 8. SECURITY CONSIDERATIONS

### 8.1. Backend Security

1. **Input Validation**: All incoming `PlayerAction` validated with `validator` crate
2. **Rate Limiting**: `tower_governor` middleware for WebSocket messages
3. **Authentication** (Optional): JWT tokens for authenticated sessions
4. **HTTPS/WSS**: TLS termination at reverse proxy (nginx/caddy)
5. **Denial of Service**: Connection limits, message size limits

### 8.2. Frontend Security (WASM)

1. **Content Security Policy**: Strict CSP headers
2. **Subresource Integrity**: All assets served with SRI hashes
3. **No Eval**: WASM has no `eval`, inherently safer than JS
4. **Memory Safety**: Rust prevents buffer overflows, use-after-free

---

## 9. DEPLOYMENT ARCHITECTURE

### 9.1. Docker Deployment

```dockerfile
# Backend Dockerfile
FROM rust:1.75-slim as builder
WORKDIR /app
COPY Cargo.* ./
COPY backend/ backend/
COPY shared_core/ shared_core/
RUN cargo build --release --manifest-path backend/Cargo.toml

FROM debian:bookworm-slim
COPY --from=builder /app/target/release/qualia-tempo-backend /usr/local/bin/
COPY backend/config.yaml /etc/qualia-tempo/
EXPOSE 8080
CMD ["qualia-tempo-backend"]
```

### 9.2. Production Stack

```
┌──────────────────────────────────────┐
│         Load Balancer (AWS ALB)      │
└──────────────┬───────────────────────┘
               │
    ┌──────────┴──────────┐
    ▼                     ▼
┌──────────┐         ┌──────────┐
│ Backend  │         │ Backend  │
│ Instance │         │ Instance │
│ (Docker) │         │ (Docker) │
└────┬─────┘         └────┬─────┘
     │                    │
     └──────────┬─────────┘
                ▼
         ┌────────────┐
         │ PostgreSQL │
         │ (Replicas) │
         └────────────┘

┌──────────────────────────────────────┐
│         CDN (CloudFlare)             │
└──────────────┬───────────────────────┘
               │
               ▼
         ┌──────────┐
         │ S3/R2    │
         │ (WASM +  │
         │  Assets) │
         └──────────┘
```

---

## 10. TESTING STRATEGY

### 10.1. Test Pyramid

```
        ▲
       ╱ ╲
      ╱ E2E╲         ← 5% (Browser automation with `wasm-pack test`)
     ╱─────╲
    ╱Integr╲        ← 15% (Backend + Frontend integration)
   ╱────────╲
  ╱  Unit    ╲      ← 80% (Pure function tests, mocked dependencies)
 ╱────────────╲
```

### 10.2. Test Commands

```bash
# Unit tests (all crates)
cargo test --workspace

# Integration tests (backend only)
cargo test --manifest-path backend/Cargo.toml --test '*'

# WASM tests (frontend)
wasm-pack test --headless --firefox frontend/

# Property-based tests
cargo test --features proptest

# Benchmarks
cargo bench --workspace

# Coverage report
cargo tarpaulin --out Html --workspace
```

---

## 11. MIGRATION STRATEGY

**PRINCIPLE RECTOR**: The reescritura a Rust no es una simplificación, sino una mejora y optimización del sistema existente. La estrategia consiste en una traducción de alta fidelidad de la lógica de negocio ya validada, aplicando desde el primer día los patrones de concurrencia, rendimiento y seguridad idiomáticos de Rust. Se prohíbe la introducción de implementaciones 'básicas' o 'single-threaded' para funcionalidades críticas que ya existen de forma robusta en el sistema original. El objetivo es la paridad de funcionalidades mejorada, no la reinvención.

### 11.1. Phase 1: High-Fidelity Translation Foundation (Weeks 1-2)

- [ ] Set up workspace structure with full QUALIA.CODE.RUST compliance
- [ ] Implement `shared_core` contracts with complete Serde/JsonSchema support
- [ ] Create backend EventBus using `tokio::sync::broadcast` (lock-free from day one)
- [ ] Implement Axum WebSocket server with full binary serialization (bincode)
- [ ] Minimal frontend with Leptos and tokio::sync::broadcast for EventBus

### 11.2. Phase 2: Core Business Logic Translation (Weeks 3-6)

- [ ] GameLogicService with full scoring, combo, and health systems (parallel-ready)
- [ ] QualiaStateCalculatorService with real-time qualia computation
- [ ] BossAIService with complete pattern recognition and adaptive behavior
- [ ] HarmonyAnalysisService with chord detection and musical analysis
- [ ] ParticleEngineService with dynamic Rayon thread pool (num_cpus::get() default)

### 11.3. Phase 3: Frontend Rendering & Audio Integration (Weeks 7-9)

- [ ] wgpu renderer with full shader pipeline (vertex, fragment, compute)
- [ ] Particle rendering system with GPU acceleration
- [ ] Advanced post-processing (bloom, reaction-diffusion, SDFs)
- [ ] Complete audio integration (FFT analysis, 8D positioning, Web Audio API)

### 11.4. Phase 4: Full System Integration & Optimization (Weeks 10-11)

- [ ] Complete frontend ↔ backend communication with binary protocols
- [ ] Performance optimization (PGO, SIMD, arena allocation)
- [ ] Comprehensive testing with high-fidelity mocks (mockall)
- [ ] Load testing and profiling for production readiness

### 11.5. Phase 5: Production Deployment (Weeks 12-13)

- [ ] Docker containerization with multi-stage builds
- [ ] CI/CD pipelines with automated testing and deployment
- [ ] Security audit and penetration testing
- [ ] Documentation completion and API stabilization
- [ ] Production deployment with monitoring and rollback capabilities

---

## 12. LIBRARY DEPENDENCIES (Definitive List)

### 12.1. Backend (`backend/Cargo.toml`)

```toml
[dependencies]
# Async runtime
tokio = { version = "1.41", features = ["full"] }
axum = "0.7"
tower-http = { version = "0.5", features = ["trace", "cors"] }

# WebSocket
tokio-tungstenite = "0.21"
futures = "0.3"

# Serialization
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
bincode = "1.3"

# Dependency Injection
shaku = "0.6"
async-trait = "0.1"

# Event Bus - tokio::sync::broadcast (built-in to tokio)
# No external dependency needed - part of tokio "full" features

# Logging
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter", "json"] }

# Configuration
config = "0.14"
serde_yaml = "0.9"

# Error handling
anyhow = "1.0"
thiserror = "1.0"

# Utilities
uuid = { version = "1.0", features = ["v4", "serde"] }
chrono = { version = "0.4", features = ["serde"] }

# Parallel computation
rayon = "1.8"

# Validation
validator = { version = "0.16", features = ["derive"] }

# Schema generation
schemars = "1.0"

# Testing mocks
mockall = "0.12"

# Shared core
shared_core = { path = "../shared_core" }
```

### 12.2. Frontend (`frontend/Cargo.toml`)

```toml
[dependencies]
# UI Framework
leptos = { version = "0.5", features = ["csr"] }
leptos_meta = "0.5"
leptos_router = "0.5"

# Rendering
wgpu = "22.0"
winit = "0.29"

# WebSocket (WASM)
tokio-tungstenite = { version = "0.21", features = ["rustls-tls-webpki-roots"] }
futures = "0.3"

# Serialization
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
bincode = "1.3"

# WASM bindings
wasm-bindgen = "0.2"
wasm-bindgen-futures = "0.4"
web-sys = { version = "0.3", features = [
    "Window", "Document", "Element", "HtmlCanvasElement",
    "WebGl2RenderingContext", "AudioContext", "AudioNode",
    "AnalyserNode", "GainNode", "PannerNode"
] }

# Logging (WASM-compatible)
tracing = "0.1"
tracing-wasm = "0.2"
console_error_panic_hook = "0.1"

# Utilities
uuid = { version = "1.0", features = ["v4", "js"] }
chrono = { version = "0.4", features = ["wasmbind"] }

# Shared core
shared_core = { path = "../shared_core", features = ["wasm"] }

[dev-dependencies]
wasm-bindgen-test = "0.3"
```

### 12.3. Shared Core (`shared_core/Cargo.toml`)

```toml
[dependencies]
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
schemars = "1.0"
uuid = { version = "1.0", features = ["serde", "v4"] }
chrono = { version = "0.4", features = ["serde"] }
validator = { version = "0.16", features = ["derive"] }

[features]
default = []
wasm = ["uuid/js", "chrono/wasmbind"]
```

---

## 13. MONITORING & OBSERVABILITY

### 13.1. Logging Stack

```
Backend Logs → tracing-subscriber → Structured JSON
                                      ↓
                                  AWS CloudWatch
                                      ↓
                            Grafana Dashboard

Metrics (from tracing spans):
- Request rate
- WebSocket connections
- Event bus throughput
- Particle update latency
```

### 13.2. Key Metrics to Track

| Metric | Purpose | Alert Threshold |
|--------|---------|-----------------|
| **WebSocket Connections** | Load monitoring | > 5000 |
| **Event Bus Queue Size** | Backpressure detection | > 10000 |
| **Particle Update Time** | Performance regression | > 2ms |
| **Memory Usage** | Leak detection | > 100MB |
| **CPU Usage** | Resource exhaustion | > 80% |
| **Error Rate** | Service health | > 1% |

---

**END OF ARCHITECTURE.RUST**

*"From chaos, we forge order. From TypeScript and Python, we forge Rust. From good architecture, we forge greatness."*
