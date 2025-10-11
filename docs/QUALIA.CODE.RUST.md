# QUALIA.CODE.RUST v1.0 - The Definitive Rust Rewrite Manual
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
- **Lock-Free Data Structures**: Use crossbeam, flume, or async-channel instead of Mutex when possible
- **Arena Allocation**: Use typed-arena or bumpalo for hot paths (particle systems)
- **Inline Aggressively**: `#[inline]` or `#[inline(always)]` on hot functions
- **Profile-Guided Optimization**: Build with PGO for 10-20% performance gains

---

## 2. DEPENDENCY INJECTION: SHAKU (THE RUST INVERSIFY)

### 2.1. Core Principle
Shaku provides **compile-time dependency injection** with zero runtime overhead. It's Rust's answer to InversifyJS.

### 2.2. The Module Pattern

```rust
use shaku::{module, Component, Interface};

// Define interface trait
trait ILogger: Interface {
    fn info(&self, msg: &str);
}

// Implement component
#[derive(Component)]
#[shaku(interface = ILogger)]
struct QualiaLogger {
    #[shaku(default)]
    level: LogLevel,
}

impl ILogger for QualiaLogger {
    fn info(&self, msg: &str) {
        println!("[INFO] {}", msg);
    }
}

// Create module
module! {
    GameModule {
        components = [QualiaLogger],
        providers = []
    }
}

// Usage
let module = GameModule::builder().build();
let logger: &dyn ILogger = module.resolve_ref();
logger.info("System initialized");
```

### 2.3. Configuration Injection Pattern

**CRITICAL DIFFERENCE FROM TYPESCRIPT**: In Rust, configuration is loaded ONCE at startup and injected as **immutable references** or **Arc<Config>** for thread-safe sharing.

```rust
use serde::Deserialize;
use std::sync::Arc;

#[derive(Deserialize, Clone)]
struct MyServiceConfig {
    timeout_ms: u64,
    retry_count: u32,
}

#[derive(Component)]
#[shaku(interface = IMyService)]
struct MyService {
    config: Arc<MyServiceConfig>, // Shared, immutable
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,
}
```

### 2.4. PROHIBITED PATTERNS

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

---

## 3. SHARED CONTRACTS: SERDE + SCHEMARS (REVERSED FLOW!)

### 3.1. The Paradigm Shift

**OLD (TypeScript/Python)**: JSON Schema (source) → Generate Code (target)  
**NEW (Rust)**: Rust Structs (source) → Generate JSON Schema (documentation)

### 3.2. Contract Definition

```rust
// shared_core/src/contracts.rs
use serde::{Serialize, Deserialize};
use schemars::JsonSchema;

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct QualiaState {
    pub intensity: f32,
    pub harmony: f32,
    pub chaos: f32,
    pub kairos: f32,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum PlayerAction {
    KeyPressed { key: char, timestamp: u64, accuracy: f32 },
    Dashed { direction: Vec2, timestamp: u64 },
    MissNote { timestamp: u64 },
}
```

### 3.3. Schema Generation (Build Script)

```rust
// scripts/generate_schema.rs
use schemars::schema_for;
use std::fs;

fn main() {
    let schema = schema_for!(QualiaState);
    let json = serde_json::to_string_pretty(&schema).unwrap();
    fs::write("shared_contracts/QualiaState.schema.json", json).unwrap();
}
```

### 3.4. Validation at Boundaries

```rust
use validator::Validate;

#[derive(Deserialize, Validate)]
struct IncomingData {
    #[validate(range(min = 0.0, max = 1.0))]
    intensity: f32,
}

fn handle_message(data: IncomingData) -> Result<(), ValidationError> {
    data.validate()?; // Compile-time structure, runtime validation
    // Process...
    Ok(())
}
```

---

## 4. EVENT-DRIVEN ARCHITECTURE: ASYNC-CHANNEL + TOKIO

### 4.1. Event Bus Pattern

```rust
use async_channel::{Sender, Receiver, unbounded};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Debug, Clone)]
pub enum GameEvent {
    PlayerAction(PlayerAction),
    QualiaStateUpdated(QualiaState),
    GameStateChanged(GameState),
    BossAttack(AttackPattern),
}

pub struct EventBus {
    subscribers: Arc<RwLock<HashMap<TypeId, Vec<Sender<GameEvent>>>>>,
}

impl EventBus {
    pub fn new() -> Self {
        Self {
            subscribers: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn emit(&self, event: GameEvent) {
        let subscribers = self.subscribers.read().await;
        let type_id = TypeId::of::<GameEvent>();
        
        if let Some(subs) = subscribers.get(&type_id) {
            for sender in subs {
                let _ = sender.send(event.clone()).await;
            }
        }
    }

    pub async fn subscribe(&self) -> Receiver<GameEvent> {
        let (tx, rx) = unbounded();
        let mut subscribers = self.subscribers.write().await;
        subscribers.entry(TypeId::of::<GameEvent>())
            .or_insert_with(Vec::new)
            .push(tx);
        rx
    }
}
```

### 4.2. Service with Event Subscription

```rust
use tracing::instrument;

pub struct GameLogicService {
    event_bus: Arc<EventBus>,
    config: Arc<GameLogicConfig>,
}

impl GameLogicService {
    #[instrument(skip(self))]
    pub async fn start(&self) {
        let mut events = self.event_bus.subscribe().await;
        
        while let Ok(event) = events.recv().await {
            match event {
                GameEvent::PlayerAction(action) => {
                    self.handle_action(action).await;
                }
                _ => {}
            }
        }
    }
    
    async fn handle_action(&self, action: PlayerAction) {
        // Process action...
        let new_state = self.calculate_state(action);
        self.event_bus.emit(GameEvent::QualiaStateUpdated(new_state)).await;
    }
}
```

---

## 5. PROCEDURAL MACROS: THE DECORATOR REPLACEMENT

### 5.1. Attribute Macros (Most Common)

#### 5.1.1. The `#[instrument]` Macro (Logging)

Replaces TypeScript's `@logMethod()`:

```rust
use tracing::{instrument, info, error};

#[instrument(skip(self))] // Don't log 'self'
pub async fn process_action(&self, action: PlayerAction) -> Result<(), GameError> {
    info!("Processing action: {:?}", action);
    // Automatically logs entry, exit, and execution time
    let result = self.do_work(&action).await;
    if let Err(e) = &result {
        error!("Action failed: {}", e);
    }
    result
}
```

#### 5.1.2. Custom `#[cached]` Macro (Memoization)

Replaces manual caching:

```rust
use cached::proc_macro::cached;

#[cached(time = 60)] // Cache for 60 seconds
fn expensive_calculation(input: u32) -> f64 {
    std::thread::sleep(Duration::from_secs(2));
    (input as f64).sqrt()
}
```

#### 5.1.3. Custom `#[validate]` Macro

Replaces runtime validation:

```rust
#[validate_input]
pub fn set_intensity(&mut self, #[range(0.0..=1.0)] intensity: f32) {
    self.intensity = intensity; // Macro generates validation code
}
```

### 5.2. Derive Macros

#### 5.2.1. Serde (Serialization)

```rust
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MyData {
    field_name: String,
}
```

#### 5.2.2. Component (DI)

```rust
#[derive(Component)]
#[shaku(interface = IMyService)]
struct MyService { /* ... */ }
```

### 5.3. Building Custom Macros

```rust
// qualia_macros/src/lib.rs
use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn};

#[proc_macro_attribute]
pub fn catch_error(_attr: TokenStream, item: TokenStream) -> TokenStream {
    let input = parse_macro_input!(item as ItemFn);
    let fn_name = &input.sig.ident;
    let fn_block = &input.block;
    
    let output = quote! {
        #input.sig {
            match (|| #fn_block)() {
                Ok(val) => Ok(val),
                Err(e) => {
                    tracing::error!("Error in {}: {:?}", stringify!(#fn_name), e);
                    Err(e)
                }
            }
        }
    };
    output.into()
}
```

---

## 6. ASYNC RUNTIME: TOKIO (THE STANDARD)

### 6.1. Core Concepts

- **Tasks**: Lightweight green threads (like Web Workers but managed by Tokio)
- **Async/Await**: Non-blocking I/O without callbacks
- **Channels**: Message passing between tasks (mpsc, broadcast, watch, oneshot)

### 6.2. Backend Server Setup

```rust
// backend/src/main.rs
use tokio;
use axum::{Router, routing::get};
use tower_http::trace::TraceLayer;

#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_target(false)
        .compact()
        .init();

    let app = Router::new()
        .route("/ws", get(websocket_handler))
        .layer(TraceLayer::new_for_http());

    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    tracing::info!("Server listening on {}", addr);
    
    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .unwrap();
}
```

### 6.3. Parallel Task Spawning (Replacing Process Pools)

```rust
use tokio::task;

async fn parallel_particle_calculation(particles: Vec<Particle>) -> Vec<Particle> {
    let chunk_size = particles.len() / num_cpus::get();
    
    let handles: Vec<_> = particles
        .chunks(chunk_size)
        .map(|chunk| {
            let chunk = chunk.to_vec();
            task::spawn(async move {
                chunk.iter().map(|p| update_particle(p)).collect::<Vec<_>>()
            })
        })
        .collect();
    
    let results = futures::future::join_all(handles).await;
    results.into_iter().flat_map(|r| r.unwrap()).collect()
}
```

---

## 7. FRONTEND: WASM + WGPU + LEPTOS

### 7.1. Architecture

```
┌─────────────────────────────────────────────────┐
│  Browser                                        │
│  ┌───────────────────────────────────────────┐  │
│  │  Leptos (Rust → WASM)                     │  │
│  │  - UI Components (reactive signals)       │  │
│  │  - State Management (no Zustand needed!)  │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │  wgpu (Rust → WebGPU)                     │  │
│  │  - 3D Rendering                           │  │
│  │  - Shaders (WGSL native)                  │  │
│  │  - Particle Systems                       │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │  Web Audio (via wasm-bindgen)             │  │
│  │  - Audio playback                         │  │
│  │  - FFT Analysis                           │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### 7.2. Leptos Component Example

```rust
use leptos::*;

#[component]
pub fn GameUI(cx: Scope) -> impl IntoView {
    let (qualia_state, set_qualia_state) = create_signal(cx, QualiaState::default());
    
    // Connect to backend via WebSocket
    create_effect(cx, move |_| {
        spawn_local(async move {
            let mut ws = WebSocket::connect("ws://localhost:8080/ws").await.unwrap();
            
            while let Ok(msg) = ws.recv().await {
                let state: QualiaState = serde_json::from_str(&msg).unwrap();
                set_qualia_state.set(state);
            }
        });
    });

    view! { cx,
        <div class="game-container">
            <QualiaDisplay state=qualia_state />
            <BossRenderer />
            <InputCapture />
        </div>
    }
}
```

### 7.3. wgpu Rendering

```rust
use wgpu;

pub struct WgpuRenderer {
    device: wgpu::Device,
    queue: wgpu::Queue,
    pipeline: wgpu::RenderPipeline,
}

impl WgpuRenderer {
    pub fn new(window: &Window) -> Self {
        // Initialize WebGPU
        let instance = wgpu::Instance::new(wgpu::InstanceDescriptor {
            backends: wgpu::Backends::all(),
            ..Default::default()
        });
        
        // Create surface
        let surface = unsafe { instance.create_surface(window) }.unwrap();
        
        // Request adapter and device
        let adapter = pollster::block_on(instance.request_adapter(&wgpu::RequestAdapterOptions {
            power_preference: wgpu::PowerPreference::HighPerformance,
            compatible_surface: Some(&surface),
            ..Default::default()
        })).unwrap();
        
        let (device, queue) = pollster::block_on(adapter.request_device(
            &wgpu::DeviceDescriptor::default(),
            None,
        )).unwrap();
        
        // Create render pipeline with shaders...
        
        Self { device, queue, pipeline }
    }
    
    pub fn render(&self, particles: &[Particle]) {
        // Rendering logic...
    }
}
```

---

## 8. LOGGING: TRACING (STRUCTURED LOGGING PERFECTION)

### 8.1. Core Concepts

- **Spans**: Time periods (replace manual timing)
- **Events**: Log messages (replace console.log)
- **Subscribers**: Output targets (stdout, files, JSON, OpenTelemetry)

### 8.2. Service Implementation

```rust
use tracing::{debug, info, warn, error, instrument, span, Level};

pub struct ParticleEngine {
    config: Arc<ParticleConfig>,
}

impl ParticleEngine {
    #[instrument(skip(self), fields(particle_count = particles.len()))]
    pub async fn update(&self, particles: &mut [Particle], dt: f32) {
        let span = span!(Level::DEBUG, "particle_update");
        let _enter = span.enter();
        
        debug!("Starting particle update");
        
        for particle in particles.iter_mut() {
            particle.position += particle.velocity * dt;
            particle.lifetime -= dt;
        }
        
        info!(updated = particles.len(), "Particles updated");
    }
    
    #[instrument(skip(self), err)]
    pub async fn load_config(&self, path: &str) -> Result<Config, ConfigError> {
        info!(path, "Loading particle config");
        let config = tokio::fs::read_to_string(path).await?;
        let parsed = toml::from_str(&config)?;
        Ok(parsed)
    }
}
```

### 8.3. Initialization

```rust
// main.rs
use tracing_subscriber::{fmt, EnvFilter, prelude::*};

fn init_logging() {
    tracing_subscriber::registry()
        .with(fmt::layer().compact())
        .with(EnvFilter::from_default_env()
            .add_directive("qualia_tempo=debug".parse().unwrap())
            .add_directive("tokio=info".parse().unwrap()))
        .init();
}
```

---

## 9. TESTING: CARGO TEST + PROPTEST

### 9.1. Unit Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_qualia_calculation() {
        let calculator = QualiaCalculator::new(Config::default());
        let state = calculator.calculate(PlayerAction::KeyPressed {
            key: 'Q',
            timestamp: 1000,
            accuracy: 0.95,
        });
        
        assert!(state.intensity > 0.0);
        assert!(state.intensity <= 1.0);
    }
    
    #[tokio::test]
    async fn test_event_bus() {
        let bus = EventBus::new();
        let mut rx = bus.subscribe().await;
        
        bus.emit(GameEvent::PlayerAction(PlayerAction::Dashed {
            direction: Vec2::new(1.0, 0.0),
            timestamp: 2000,
        })).await;
        
        let event = rx.recv().await.unwrap();
        assert!(matches!(event, GameEvent::PlayerAction(_)));
    }
}
```

### 9.2. Property-Based Testing

```rust
use proptest::prelude::*;

proptest! {
    #[test]
    fn test_qualia_bounds(intensity in 0.0f32..=1.0) {
        let state = QualiaState {
            intensity,
            harmony: 0.5,
            chaos: 0.5,
            kairos: 0.5,
            timestamp: 0,
        };
        
        prop_assert!(state.intensity >= 0.0 && state.intensity <= 1.0);
    }
}
```

---

## 10. WEBSOCKET: TOKIO-TUNGSTENITE + AXUM

### 10.1. Server Handler

```rust
use axum::{
    extract::ws::{WebSocket, WebSocketUpgrade},
    response::IntoResponse,
};
use futures::{StreamExt, SinkExt};

async fn websocket_handler(
    ws: WebSocketUpgrade,
) -> impl IntoResponse {
    ws.on_upgrade(handle_socket)
}

async fn handle_socket(mut socket: WebSocket) {
    let (mut sender, mut receiver) = socket.split();
    
    // Spawn receiver task
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            if let axum::extract::ws::Message::Text(text) = msg {
                let action: PlayerAction = serde_json::from_str(&text).unwrap();
                // Process action...
            }
        }
    });
    
    // Spawn sender task (from event bus)
    let mut send_task = tokio::spawn(async move {
        let mut events = EVENT_BUS.subscribe().await;
        while let Ok(event) = events.recv().await {
            let json = serde_json::to_string(&event).unwrap();
            let _ = sender.send(axum::extract::ws::Message::Text(json)).await;
        }
    });
    
    // Wait for both tasks
    tokio::select! {
        _ = &mut recv_task => {}
        _ = &mut send_task => {}
    }
}
```

---

## 11. STATE MANAGEMENT: ARC + RWLOCK (NO ZUSTAND NEEDED!)

### 11.1. Pattern

Rust doesn't need Zustand because the type system + ownership prevents the chaos Zustand solves in JS.

```rust
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Clone)]
pub struct GameState {
    player: Arc<RwLock<PlayerState>>,
    boss: Arc<RwLock<BossState>>,
    qualia: Arc<RwLock<QualiaState>>,
}

impl GameState {
    pub async fn update_qualia(&self, new_state: QualiaState) {
        let mut qualia = self.qualia.write().await;
        *qualia = new_state;
    }
    
    pub async fn get_qualia(&self) -> QualiaState {
        self.qualia.read().await.clone()
    }
}
```

### 11.2. Reactive Pattern (For UI)

```rust
// In Leptos, use signals
let (state, set_state) = create_signal(cx, GameState::default());

// In backend, use channels
let (state_tx, state_rx) = watch::channel(GameState::default());
```

---

## 12. ARCHITECTURAL LINTING: CLIPPY + CUSTOM LINTS

### 12.1. Standard Clippy

```toml
# Cargo.toml
[workspace.lints.clippy]
all = "warn"
pedantic = "warn"
nursery = "warn"
cargo = "warn"

# Disable some overly strict lints
must_use_candidate = "allow"
```

### 12.2. Custom Lint (Via Dylint)

```rust
// qualia_lints/src/lib.rs
use dylint_linting::DynLint;

#[allow(clippy::all)]
impl DynLint for NoDirectServiceInstantiation {
    fn check_item(&mut self, cx: &LateContext, item: &Item) {
        // Detect manual instantiation...
    }
}
```

---

## 13. CRITICAL LIBRARIES REFERENCE

| Concern | Library | Notes |
|---------|---------|-------|
| Async Runtime | tokio | "Standard", use macros feature |
| HTTP Server | axum | Built on Tokio, ergonomic |
| WebSocket | tokio-tungstenite | Async WebSocket |
| Serialization | serde + serde_json | Universal de-facto standard |
| JSON Schema | schemars | Generate schemas from Rust |
| DI Container | shaku | Compile-time DI |
| Logging | tracing + tracing-subscriber | Structured logging |
| Events | async-channel or tokio::sync::mpsc | MPSC/MPMC channels |
| Frontend UI | leptos | Modern reactive framework |
| 3D Rendering | wgpu | WebGPU, native + WASM |
| Configuration | config | YAML/TOML/JSON loader |
| Testing | proptest | Property-based testing |
| Validation | validator | Derive-based validation |
| Audio (WASM) | wasm-bindgen + web-sys | Bindings to Web Audio API |
| Caching | cached | Derive macro for memoization |
| Date/Time | chrono | Datetime handling |
| Error Handling | thiserror + anyhow | Ergonomic errors |
| UUID | uuid | UUID generation |
| Regex | regex | Regex matching |
| Parallel | rayon | Data parallelism |

---

## 14. PERFORMANCE OPTIMIZATION RULES

### 14.1. Hot Path Optimization

```rust
#[inline(always)]
fn update_particle(p: &mut Particle, dt: f32) {
    p.position += p.velocity * dt; // Simple math: always inline
}

#[inline]
pub fn process_batch(particles: &mut [Particle], dt: f32) {
    for p in particles.iter_mut() {
        update_particle(p, dt); // Compiler will inline this
    }
}
```

### 14.2. Zero-Copy Deserialization

```rust
use serde::Deserialize;
use bytes::Bytes;

#[derive(Deserialize)]
struct Message<'a> {
    #[serde(borrow)]
    data: &'a str, // No allocation!
}

fn parse_message(buf: &[u8]) -> Message<'_> {
    serde_json::from_slice(buf).unwrap()
}
```

### 14.3. Arena Allocation

```rust
use typed_arena::Arena;

pub struct ParticleSystem {
    arena: Arena<Particle>,
}

impl ParticleSystem {
    pub fn spawn_particle(&self) -> &mut Particle {
        self.arena.alloc(Particle::default()) // Fast!
    }
}
```

---

## 15. ANTI-PATTERNS (CRITICAL VIOLATIONS)

### 15.1. FORBIDDEN: Unwrap in Production

```rust
// FORBIDDEN
let config = fs::read_to_string("config.yaml").unwrap(); // CRASH!

// CORRECT
let config = fs::read_to_string("config.yaml")
    .context("Failed to read config")?;
```

### 15.2. FORBIDDEN: Clone Without Reason

```rust
// FORBIDDEN (unnecessary clone)
fn process_data(data: Vec<u8>) {
    let copied = data.clone(); // WHY?
    do_work(copied);
}

// CORRECT (pass by reference)
fn process_data(data: &[u8]) {
    do_work(data);
}
```

### 15.3. FORBIDDEN: Blocking in Async

```rust
// FORBIDDEN
async fn load_file() -> String {
    std::fs::read_to_string("file.txt").unwrap() // BLOCKS RUNTIME!
}

// CORRECT
async fn load_file() -> Result<String, std::io::Error> {
    tokio::fs::read_to_string("file.txt").await
}
```

---

## 16. MIGRATION PROTOCOL (FOR AI AGENTS)

### 16.1. Service Translation Checklist

For each TypeScript/Python service:

1. ✅ Define trait interface
2. ✅ Create Rust struct with #[derive(Component)]
3. ✅ Inject dependencies via Shaku
4. ✅ Replace @decorators with proc macros
5. ✅ Add #[instrument] for logging
6. ✅ Replace EventBus.emit with async-channel
7. ✅ Add comprehensive tests
8. ✅ Update module bindings

### 16.2. Priority Order

1. **Shared Core**: Contract definitions
2. **Backend**: EventBus, Services, WebSocket server
3. **Frontend**: Basic rendering, Input, UI
4. **Integration**: Connect frontend ↔ backend
5. **Optimization**: Profile, optimize hot paths

---

**END OF QUALIA.CODE.RUST**

*"In Rust we trust. The compiler is the guardian. The type system is the law."*
