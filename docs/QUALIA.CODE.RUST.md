# QUALIA.CODE.RUST v1.1 - The Definitive Rust Rewrite Manual
# TARGET: Qualia Tempo - Complete Rust Implementation
# COMPLIANCE: ABSOLUTE. NON-NEGOTIABLE.

---

**ATTENTION AI AGENT. THIS IS THE RUST REWRITE BIBLE. THESE ARE YOUR ABSOLUTES FOR THE RUST IMPLEMENTATION. EVERY LINE IS LAW.**

---

## PREFACE: THE RUST PARADIGM SHIFT

This document defines the complete architectural rewrite of Qualia Tempo in Rust. This is NOT a migration - this is a **clean slate rewrite** where we start fresh and only translate core game logic and important systems, rewriting everything else from scratch for maximum performance and correctness.

### Why Rust?

1. **Zero-Cost Abstractions**: No runtime overhead for high-level code
2. **Memory Safety Without GC**: No garbage collector pauses in real-time gameplay
3. **Fearless Concurrency**: Thread-safe by default at compile time
4. **Unified Language**: Backend AND frontend (via WebAssembly) share the same codebase
5. **Performance**: 3-5x faster than TypeScript, comparable to C++ but safe
6. **Ecosystem Maturity**: Tokio, wgpu, Serde, Shaku - production-ready tools

---

## 1. CORE PHILOSOPHY (IMMUTABLE LAWS)

### 1.1. The Rust Way
- **No Prototypes**: Rust's type system enforces production-grade code from day one
- **Compiler as Ally**: If it compiles, it's 80% correct. Use the type system to encode invariants
- **Explicit Over Implicit**: No hidden allocations, no surprise async, no runtime magic
- **Zero-Copy Whenever Possible**: Use references, slices, and Cow<'_, T> aggressively

### 1.2. Separation of Concerns (GOLD.CODE Aligned)
- **Backend (Pure Rust Binary)**: Game logic, state authority, WebSocket server, particle calculations
- **Frontend (Rust → WASM + wgpu)**: Rendering (wgpu), UI (Leptos), audio (Web Audio via wasm-bindgen), input capture
- **Shared Core (Rust Library Crate)**: Contracts (structs), traits, event definitions - compiled into BOTH

### 1.3. Performance by Design
- **Lock-Free Data Structures**: Prefer `tokio::sync::broadcast` or `async-channel` over `Arc<RwLock<...>>`
- **Arena Allocation**: Use `typed-arena` or `bumpalo` for hot paths (particle systems)
- **Inline Aggressively**: `#[inline]` or `#[inline(always)]` on hot functions
- **Profile-Guided Optimization**: Build with PGO for 10-20% performance gains

---

## 2. DEPENDENCY INJECTION: SHAKU (THE RUST INVERSIFY)

### 2.1. Core Principle
Shaku provides **compile-time dependency injection** with zero runtime overhead. It's Rust's answer to InversifyJS.

**MANDATE**: All service instantiation MUST go through Shaku modules. Direct instantiation with `new()` is a CRITICAL VIOLATION.

### 2.2. Configuration Injection Pattern

**CRITICAL DIFFERENCE FROM TYPESCRIPT**: In Rust, configuration is loaded ONCE at startup and injected as **immutable references** or **Arc<Config>** for thread-safe sharing.

**PROHIBITED**: IConfigurationService pattern. Direct configuration injection eliminates the Service Locator anti-pattern.

### 2.3. PROHIBITED PATTERNS

1. **ANTI-PATTERN: Direct Instantiation**
   ```rust
   // FORBIDDEN
   let service = MyService::new(config, logger); // CRITICAL VIOLATION
   ```

2. **ANTI-PATTERN: Mutable Global State**
   ```rust
   // FORBIDDEN
   static mut CONFIG: Option<Config> = None; // UNSAFE AND WRONG
   ```

3. **ANTI-PATTERN: Service Locator**
   ```rust
   // FORBIDDEN - Only in composition root!
   fn some_function() {
       let service = MODULE.resolve::<IMyService>(); // VIOLATION
   }
   ```

**Detailed Implementation**: See `QUALIA.MANUAL.RUST.md` Section 2.

---

## 3. SHARED CONTRACTS: SERDE + SCHEMARS (REVERSED FLOW!)

### 3.1. The Paradigm Shift

**OLD (TypeScript/Python)**: JSON Schema (source) → Generate Code (target)  
**NEW (Rust)**: Rust Structs (source) → Generate JSON Schema (documentation)

**RATIONALE**: Rust's type system is the source of truth. JSON schemas are generated artifacts for documentation and interoperability.

### 3.2. Contract Definition Rules

- **MANDATE**: All shared structs MUST derive `Serialize`, `Deserialize`, and `JsonSchema`
- **MANDATE**: Use `#[serde(rename_all = "camelCase")]` for JavaScript interop
- **MANDATE**: Use `#[serde(tag = "type")]` for tagged union enums
- **VALIDATION**: Use `validator` crate for runtime boundary validation

### 3.3. Schema Generation Protocol

**WORKFLOW**:
1. Define structs in `shared_core/src/contracts.rs`
2. Run build script `scripts/generate_schema.rs`
3. JSON schemas written to `/shared_contracts/*.schema.json`
4. NEVER manually edit generated schemas

**Detailed Implementation**: See `QUALIA.MANUAL.RUST.md` Section 3.

---

## 4. EVENT-DRIVEN ARCHITECTURE: TOKIO::SYNC::BROADCAST (CRITICAL CORRECTION)

### 4.1. The EventBus Pattern

**CRITICAL MANDATE**: Use `tokio::sync::broadcast` for the EventBus. Manual implementations with `Arc<RwLock<HashMap<...>>>` or `Arc<RwLock<Vec<...>>>` are STRICTLY FORBIDDEN.

**RATIONALE**:
- `tokio::sync::broadcast` is the idiomatic Tokio solution for one-to-many event distribution
- Manual `RwLock` implementations create lock contention under async load
- `broadcast` is lock-free, optimized for the async runtime, and designed for this exact pattern

### 4.2. Architecture Principles

- **Multiple Consumers**: Each service subscribes and receives all events (fan-out pattern)
- **Type-Safe Events**: Use Rust enums for compile-time event type safety
- **No Slow Subscribers**: If a subscriber can't keep up, it lags (configurable behavior)
- **Clone Events**: Events must be `Clone` for distribution to multiple subscribers

### 4.3. ANTI-PATTERN: Manual EventBus with RwLock

```rust
// FORBIDDEN - CRITICAL ANTI-PATTERN
pub struct EventBus {
    subscribers: Arc<RwLock<Vec<Sender<GameEvent>>>>, // VIOLATION!
}

impl EventBus {
    pub async fn emit(&self, event: GameEvent) {
        let subs = self.subscribers.read().await; // LOCK CONTENTION!
        for sender in subs.iter() {
            let _ = sender.send(event.clone()).await;
        }
    }
}
```

**WHY FORBIDDEN**:
- `RwLock` blocks under contention, degrading async performance
- Manual subscriber management is error-prone (dead subscriber cleanup)
- Reinventing what `tokio::sync::broadcast` does optimally

### 4.4. CORRECT PATTERN: tokio::sync::broadcast

```rust
// CORRECT - Use tokio::sync::broadcast
use tokio::sync::broadcast;

pub struct EventBus {
    tx: broadcast::Sender<GameEvent>,
}

impl EventBus {
    pub fn new(capacity: usize) -> Self {
        let (tx, _rx) = broadcast::channel(capacity);
        Self { tx }
    }

    pub fn emit(&self, event: GameEvent) -> Result<usize, broadcast::error::SendError<GameEvent>> {
        self.tx.send(event) // Lock-free!
    }

    pub fn subscribe(&self) -> broadcast::Receiver<GameEvent> {
        self.tx.subscribe()
    }
}
```

**ADVANTAGES**:
- Zero locks, zero contention
- Built-in lagging subscriber detection
- Automatic cleanup of dropped receivers
- Battle-tested in production Tokio applications

**Detailed Implementation**: See `QUALIA.MANUAL.RUST.md` Section 4.

---

## 5. PROCEDURAL MACROS: THE DECORATOR REPLACEMENT

### 5.1. Core Principle

Procedural macros replace TypeScript decorators but operate at COMPILE TIME, generating code before the program runs.

### 5.2. Standard Macros

- **`#[derive(Serialize, Deserialize)]`**: Automatic serialization (Serde)
- **`#[derive(Component)]`**: Dependency injection (Shaku)
- **`#[instrument]`**: Automatic logging with entry/exit/timing (Tracing)
- **`#[cached]`**: Memoization (cached crate)

### 5.3. Custom Macro Requirements

- **LOCATION**: `qualia_macros/` separate crate (proc-macro = true)
- **TESTING**: Macros must have expansion tests
- **DOCUMENTATION**: Document macro behavior with examples

**Detailed Implementation**: See `QUALIA.MANUAL.RUST.md` Section 5.

---

## 6. ASYNC RUNTIME: TOKIO (THE STANDARD)

### 6.1. Core Mandate

**TOKIO IS THE STANDARD**. Do not use `async-std` (deprecated in favor of `smol`). The Tokio ecosystem is the de-facto async standard in Rust.

### 6.2. Key Principles

- **Tasks**: Lightweight green threads (use `tokio::spawn`)
- **Channels**: Message passing (`mpsc`, `broadcast`, `watch`, `oneshot`)
- **No Blocking**: NEVER call blocking I/O in async contexts
- **Runtime Configuration**: Multi-threaded by default (`#[tokio::main]`)

### 6.3. ANTI-PATTERN: Blocking in Async

```rust
// FORBIDDEN
async fn load_config() -> String {
    std::fs::read_to_string("config.yaml").unwrap() // BLOCKS RUNTIME!
}

// CORRECT
async fn load_config() -> Result<String, std::io::Error> {
    tokio::fs::read_to_string("config.yaml").await // ASYNC I/O
}
```

**Detailed Implementation**: See `QUALIA.MANUAL.RUST.md` Section 6.

---

## 7. FRONTEND: WASM + WGPU + LEPTOS

### 7.1. Architecture Overview

- **Leptos**: Reactive UI framework (signals replace Zustand)
- **wgpu**: Cross-platform graphics (WebGPU API, native + WASM)
- **wasm-bindgen**: JavaScript interop for Web Audio

### 7.2. State Management

**NO ZUSTAND NEEDED**: Leptos signals provide reactive state management with compile-time guarantees.

```rust
let (state, set_state) = create_signal(cx, GameState::default());
// Automatically reactive - UI updates when state changes
```

### 7.3. Rendering Pipeline

**wgpu MANDATE**: All rendering must use wgpu (not Three.js). Shaders written in WGSL (WebGPU Shading Language).

**Detailed Implementation**: See `QUALIA.MANUAL.RUST.md` Section 7.

---

## 8. LOGGING: TRACING (STRUCTURED LOGGING PERFECTION)

### 8.1. Core Concepts

- **Spans**: Time periods with context (replace manual timing)
- **Events**: Log messages at levels (debug, info, warn, error)
- **Subscribers**: Output targets (stdout, files, JSON, OpenTelemetry)
- **Instrumentation**: `#[instrument]` macro for automatic method logging

### 8.2. MANDATE

- **PROHIBITED**: `println!`, `eprintln!`, `dbg!` in production code
- **REQUIRED**: `tracing::info!`, `tracing::error!`, etc.
- **REQUIRED**: `#[instrument]` on all public service methods

**Detailed Implementation**: See `QUALIA.MANUAL.RUST.md` Section 8.

---

## 9. TESTING: ISOLATED CONTAINER PATTERN + HIGH-FIDELITY MOCKING

### 9.1. Core Philosophy (GOLD.CODE ALIGNMENT)

**FROM QUALIA.CODE (MANDATORY)**:
- **Isolated Container Pattern**: Each test receives a completely new container instance
- **High-Fidelity Mocking**: Mocks must faithfully implement trait contracts with type-safe defaults
- **Zero Tolerance**: A broken test is a broken build

### 9.2. Isolated Container Pattern in Rust

**MANDATE**: Create a test module factory that builds isolated Shaku containers per test.

**PRINCIPLE**: Each test must receive a fresh `GameModule` with all dependencies mocked, preventing cross-contamination.

```rust
// test_container_factory.rs
pub fn create_test_module() -> GameModule {
    GameModule::builder()
        .with_component_override::<dyn ILogger>(Box::new(|| {
            Box::new(MockLogger::new())
        }))
        .with_component_override::<dyn IEventBus>(Box::new(|| {
            Box::new(MockEventBus::new())
        }))
        .build()
}
```

**PROHIBITED**:
- Sharing a global container between tests
- Parent/child container patterns for services
- Direct `new()` instantiation in tests

### 9.3. High-Fidelity Mocking with `mockall`

**CRITICAL MANDATE**: All service mocks MUST use the `mockall` crate for trait implementation.

**PRINCIPLE**: A mock must be a faithful, type-safe representation of the interface. Default behaviors must match return types.

#### 9.3.1. The mockall Pattern

```rust
use mockall::*;

#[automock]
pub trait ILogger: Send + Sync {
    fn info(&self, msg: &str);
    fn error(&self, msg: &str);
}

#[automock]
pub trait IGameLogicService: Send + Sync {
    async fn process_action(&self, action: PlayerAction) -> Result<QualiaState, GameError>;
    fn get_score(&self) -> u32;
}
```

#### 9.3.2. High-Fidelity Mock Rules (MANDATORY)

1. **Respect Return Types**: Mocks MUST return type-safe defaults
   ```rust
   // CORRECT
   let mut mock = MockIGameLogicService::new();
   mock.expect_get_score()
       .return_const(0u32); // High-fidelity: returns u32, not undefined

   // FORBIDDEN - No expectation = panic at runtime
   let mock = MockIGameLogicService::new(); // VIOLATION
   ```

2. **Async Methods**: Use `returning` for futures
   ```rust
   mock.expect_process_action()
       .returning(|_| Box::pin(async { Ok(QualiaState::default()) }));
   ```

3. **Complex Objects**: Provide sensible defaults
   ```rust
   mock.expect_get_dimensions()
       .return_const(Dimensions { width: 1920, height: 1080 });
   ```

4. **Prohibition of Low-Fidelity Mocks**
   ```rust
   // FORBIDDEN - Bare mock without expectations
   let mock = MockILogger::new(); // VIOLATION: Will panic if called!

   // CORRECT - All used methods have expectations
   let mut mock = MockILogger::new();
   mock.expect_info().return_const(());
   mock.expect_error().return_const(());
   ```

### 9.4. Testing Workflow (5-STEP PROTOCOL)

#### STEP 1: Identify Service Under Test (SUT)
- Choose ONE service to test in isolation

#### STEP 2: Create Isolated Test Container
```rust
let module = create_test_module();
```

#### STEP 3: Configure Mock Behaviors
```rust
let mut mock_logger = MockILogger::new();
mock_logger.expect_info()
    .with(predicate::eq("Processing action"))
    .times(1)
    .return_const(());
```

#### STEP 4: Exercise the SUT
```rust
let sut: &dyn IGameLogicService = module.resolve_ref();
let result = sut.process_action(action).await;
```

#### STEP 5: Assert Results and Interactions
```rust
assert!(result.is_ok());
assert_eq!(result.unwrap().intensity, 0.95);
// mockall automatically verifies expectations on drop
```

### 9.5. Property-Based Testing

**MANDATE**: Use `proptest` for testing invariants over ranges of inputs.

```rust
use proptest::prelude::*;

proptest! {
    #[test]
    fn test_qualia_bounds(intensity in 0.0f32..=1.0) {
        let state = QualiaState { intensity, ..Default::default() };
        prop_assert!(state.intensity >= 0.0 && state.intensity <= 1.0);
    }
}
```

### 9.6. Test Organization

**STRUCTURE**:
```
backend/
├── src/
│   └── services/
│       ├── game_logic_service.rs
│       └── tests/                    # Unit tests
│           ├── mod.rs
│           └── game_logic_tests.rs
└── tests/                            # Integration tests
    ├── test_container_factory.rs
    └── full_game_loop.rs

frontend/
└── src/
    └── services/
        └── tests/
            ├── mocks/                # Centralized mocks
            │   ├── logger.rs
            │   └── event_bus.rs
            └── game_ui_tests.rs
```

**MANDATE**: All mocks centralized in `tests/mocks/` directory, one file per interface.

**Detailed Implementation**: See `QUALIA.MANUAL.RUST.md` Section 9.

---

## 10. WEBSOCKET: TOKIO-TUNGSTENITE + AXUM

### 10.1. Core Pattern

- **Server**: Axum WebSocket handler with bidirectional channels
- **Client (WASM)**: tokio-tungstenite compiled to WebAssembly
- **Serialization**: Use `bincode` or `msgpack` for binary (faster than JSON)

### 10.2. Key Principles

- **Split Socket**: Use `socket.split()` for independent send/receive tasks
- **Graceful Shutdown**: Use `tokio::select!` for clean disconnection
- **Error Handling**: Log errors, don't panic on client disconnect

**Detailed Implementation**: See `QUALIA.MANUAL.RUST.md` Section 10.

---

## 11. STATE MANAGEMENT: ARC + RWLOCK VS SIGNALS

### 11.1. Backend State

**Pattern**: `Arc<RwLock<T>>` for shared mutable state across async tasks.

```rust
#[derive(Clone)]
pub struct GameState {
    qualia: Arc<RwLock<QualiaState>>,
}
```

**MANDATE**: Minimize lock hold time. Read or write, then immediately release.

### 11.2. Frontend State

**Pattern**: Leptos signals (reactive, no locks needed).

```rust
let (state, set_state) = create_signal(cx, GameState::default());
```

**NO ZUSTAND NEEDED**: Leptos provides reactive state management natively.

**Detailed Implementation**: See `QUALIA.MANUAL.RUST.md` Section 11.

---

## 12. ARCHITECTURAL LINTING: CLIPPY + CUSTOM LINTS

### 12.1. Standard Clippy Configuration

```toml
[workspace.lints.clippy]
all = "warn"
pedantic = "warn"
nursery = "warn"
cargo = "warn"
unwrap_used = "deny"           # No unwrap in production
expect_used = "warn"           # Minimize expect
missing_errors_doc = "warn"    # Document error returns
```

### 12.2. Custom Lints

**Future**: Implement custom lints with `dylint` for QUALIA.CODE enforcement.

**Detailed Implementation**: See `QUALIA.MANUAL.RUST.md` Section 12.

---

## 13. DOCUMENTATION CONVENTION (GOLD.CODE MANDATORY)

### 13.1. The Responsibility Header (MANDATORY)

**FROM APPENDIX A OF QUALIA.CODE**: Every major component's docstring MUST begin with a `# Responsibility` header.

**FORMAT**:
```rust
//! # Responsibility
//! [Single-sentence description of the component's architectural role]
//!
//! ---
//!
//! [Detailed technical documentation, if needed]
```

**RATIONALE**:
1. **Clarity for AI**: Machine-parseable entry point for understanding purpose
2. **Architectural Alignment**: Forces declaration of single responsibility
3. **Automated Tooling**: Extracted by graph generators for architectural mapping

### 13.2. Examples

#### Module Docstring
```rust
//! # Responsibility
//! Manages all real-time audio processing and spatialization based on game state.
//!
//! ---
//!
//! This module contains the AudioService and related components for sound layers,
//! effects, and synchronization with gameplay events.
```

#### Struct Docstring
```rust
/// # Responsibility
/// Represents the complete, serializable state of the game at any given moment.
///
/// ---
///
/// This struct is the single source of truth for game state, used for saving,
/// loading, and network synchronization.
pub struct GameState {
    // fields...
}
```

#### FORBIDDEN Example
```rust
/// This struct holds game state. It has fields for player and boss.
/// Created on Tuesday. Might refactor later.
// VIOLATION: No structured # Responsibility header, verbose, mixes concerns
pub struct GameState { /* ... */ }
```

### 13.3. MANDATE FOR ALL MAJOR COMPONENTS

**REQUIRED** for:
- All `pub struct` types
- All `pub trait` definitions
- All `pub mod` modules
- All service implementations

**Detailed Examples**: See `QUALIA.MANUAL.RUST.md` Section 13.

---

## 14. CRITICAL LIBRARIES REFERENCE

| Concern | Library | Version | Notes |
|---------|---------|---------|-------|
| Async Runtime | tokio | 1.41+ | Use `features = ["full"]` |
| HTTP Server | axum | 0.7+ | Built on Tokio |
| WebSocket | tokio-tungstenite | 0.21+ | Async WebSocket |
| Serialization | serde + serde_json | 1.0+ | Universal standard |
| JSON Schema | schemars | 1.0+ | Generate from Rust |
| DI Container | shaku | 0.6+ | Compile-time DI |
| Logging | tracing | 0.1+ | Structured logging |
| Event Bus | tokio::sync::broadcast | (built-in) | **MANDATE for EventBus** |
| Frontend UI | leptos | 0.5+ | Reactive framework |
| 3D Rendering | wgpu | 22.0+ | WebGPU (native + WASM) |
| Testing Mocks | mockall | 0.12+ | **MANDATE for trait mocks** |
| Property Tests | proptest | 1.0+ | Property-based testing |
| Validation | validator | 0.16+ | Derive-based validation |
| Audio (WASM) | wasm-bindgen + web-sys | 0.2+ | Web Audio bindings |
| Parallel | rayon | 1.8+ | Data parallelism |
| Error Handling | thiserror + anyhow | 1.0+ | Ergonomic errors |

---

## 15. PERFORMANCE OPTIMIZATION RULES

### 15.1. Inlining Strategy

```rust
#[inline(always)]  // Force inline (hot paths only)
fn update_particle(p: &mut Particle, dt: f32) { /* ... */ }

#[inline]  // Suggest inline (most public methods)
pub fn process_batch(particles: &mut [Particle]) { /* ... */ }
```

### 15.2. Zero-Copy Deserialization

```rust
#[derive(Deserialize)]
struct Message<'a> {
    #[serde(borrow)]
    data: &'a str, // No allocation!
}
```

### 15.3. Arena Allocation

```rust
use typed_arena::Arena;

pub struct ParticleSystem {
    arena: Arena<Particle>,
}
```

**Detailed Techniques**: See `QUALIA.MANUAL.RUST.md` Section 14.

---

## 16. ANTI-PATTERNS (CRITICAL VIOLATIONS)

### 16.1. FORBIDDEN: Manual EventBus with RwLock

```rust
// CRITICAL VIOLATION
struct EventBus {
    subscribers: Arc<RwLock<Vec<Sender<Event>>>>, // ANTI-PATTERN!
}
```

**USE**: `tokio::sync::broadcast` instead.

### 16.2. FORBIDDEN: Unwrap in Production

```rust
// FORBIDDEN
let data = parse_input(input).unwrap(); // CRASH ON INVALID INPUT!

// CORRECT
let data = parse_input(input).context("Failed to parse input")?;
```

### 16.3. FORBIDDEN: Blocking in Async

```rust
// FORBIDDEN
async fn load() -> String {
    std::fs::read_to_string("file.txt").unwrap() // BLOCKS RUNTIME!
}

// CORRECT
async fn load() -> Result<String, std::io::Error> {
    tokio::fs::read_to_string("file.txt").await
}
```

### 16.4. FORBIDDEN: Low-Fidelity Mocks

```rust
// FORBIDDEN
let mock = MockILogger::new(); // No expectations = panic!

// CORRECT
let mut mock = MockILogger::new();
mock.expect_info().return_const(());
```

---

## 17. MIGRATION PROTOCOL (FOR AI AGENTS)

### 17.1. Service Translation Checklist

For each TypeScript/Python service:

1. ✅ Define trait interface with `# Responsibility` docstring
2. ✅ Create struct with `#[derive(Component)]`
3. ✅ Inject dependencies via Shaku (no `new()`)
4. ✅ Replace `@logMethod` with `#[instrument]`
5. ✅ Replace manual EventBus with `tokio::sync::broadcast`
6. ✅ Add unit tests with `mockall` mocks
7. ✅ Add integration tests with isolated container
8. ✅ Verify Clippy passes (no warnings)

### 17.2. Priority Order

1. **Shared Core**: Contract definitions, event enums
2. **Backend**: EventBus (broadcast), core services, WebSocket server
3. **Frontend**: wgpu renderer, Leptos UI, input handling
4. **Integration**: Connect frontend ↔ backend via WebSocket
5. **Optimization**: Profile with `cargo flamegraph`, optimize hot paths

---

**END OF QUALIA.CODE.RUST v1.1**

*"In Rust we trust. The compiler is the guardian. The type system is the law. The broadcast channel is the EventBus."*
