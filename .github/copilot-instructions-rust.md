# RUST DEVELOPMENT QUICK REFERENCE
# QUALIA TEMPO - Rust Rewrite
# VERSION: 1.0
# COMPLIANCE: QUALIA.CODE.RUST v1.1

---

## 🎯 PURPOSE

This is your **practical guide** for Rust development in Qualia Tempo. While `@QUALIA.CODE.RUST.md` defines **WHAT** and **WHY** (architectural laws), this guide shows **HOW** and **WHEN** (implementation patterns).

**GOLDEN RULE**: If you're unsure about architecture → consult `@QUALIA.CODE.RUST.md`. If you're unsure about implementation → use this guide.

---

## 📋 QUICK REFERENCE: When to Use What

| Task | Tool/Pattern | When to Use | Example |
|------|--------------|-------------|---------|
| **Event Distribution** | `tokio::sync::broadcast` | Always for EventBus | `let (tx, _) = broadcast::channel(1000);` |
| **Dependency Injection** | `Shaku` + `#[Component]` | All service implementations | `#[derive(Component)]` |
| **Mocking** | `mockall::mock!` | All test mocks | `mock! { pub MockLogger {} }` |
| **Async Traits** | `#[async_trait]` | Service interfaces with async methods | `#[async_trait] trait IService` |
| **Serialization** | `#[derive(Serialize, Deserialize)]` | All data contracts | For WebSocket/HTTP |
| **Error Handling** | `anyhow::Result` | Service methods | `async fn do_work() -> Result<()>` |
| **Logging** | `tracing` macros | All services | `info!("Message")` not `println!` |
| **Documentation** | `# Responsibility` header | All public types | See section below |

---

## 📁 FILE STRUCTURE PROTOCOL

### Workspace Layout (Mandatory)

```
qualia-tempo-rust/
├── Cargo.toml                      # Workspace manifest
├── shared_core/                    # Shared types (no dependencies on backend/frontend)
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs
│       ├── contracts.rs            # QualiaState, PlayerAction, GameState
│       ├── events.rs               # GameEvent enum
│       └── traits.rs               # Shared trait interfaces
├── backend/                        # Server (async runtime, WebSocket, services)
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs                 # Entry point (Tokio runtime)
│       ├── config.rs               # YAML configuration loading
│       ├── services/               # Business logic
│       │   ├── mod.rs
│       │   ├── interfaces/         # Trait definitions (ILogger, IEventBus, etc.)
│       │   ├── event_bus.rs        # EventBus implementation
│       │   ├── game_logic.rs       # Game logic service
│       │   └── tests/              # Unit tests
│       │       ├── mod.rs
│       │       ├── mocks/          # Centralized mocks (MockLogger, MockEventBus)
│       │       └── test_container_factory.rs
│       └── handlers/               # HTTP/WebSocket handlers
│           └── websocket.rs
└── frontend/                       # WASM client (Leptos UI + wgpu)
    ├── Cargo.toml
    ├── index.html
    └── src/
        ├── lib.rs
        ├── components/             # Leptos UI components
        ├── rendering/              # wgpu rendering pipeline
        └── audio/                  # Web Audio bindings
```

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| **Trait (Interface)** | `IServiceName` | `ILogger`, `IEventBus` |
| **Implementation** | `ServiceName` | `EventBusService`, `QualiaLogger` |
| **Config Struct** | `ServiceNameConfig` | `GameLogicConfig`, `ServerConfig` |
| **Contract Struct** | `EntityName` or `EntityNameState` | `QualiaState`, `PlayerAction` |
| **Mock** | `MockServiceName` | `MockLogger`, `MockEventBus` |
| **Test Module** | `service_name_tests.rs` | `game_logic_tests.rs` |

---

## 📝 DOCSTRING PROTOCOL

### # Responsibility Header (MANDATORY)

**For Modules** (`//!` doc comments):

```rust
//! # Responsibility
//! Provides structured logging throughout the application.
//!
//! ---
//!
//! This module implements the ILogger trait, forwarding all log calls
//! to the tracing crate for unified observability.

pub mod logger;
```

**For Structs/Traits** (`///` doc comments):

```rust
/// # Responsibility
/// Represents the player's current emotional/musical state in the game.
///
/// ---
///
/// All values are normalized to [0.0, 1.0] range. This struct is
/// serialized over WebSocket for real-time frontend updates.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QualiaState {
    pub intensity: f32,
    pub harmony: f32,
    pub chaos: f32,
    pub kairos: f32,
}
```

**For Functions** (optional but recommended for complex logic):

```rust
/// # Responsibility
/// Calculates qualia state from player action with accuracy scoring.
///
/// ---
///
/// Applies intensity multiplier based on accuracy, then clamps all
/// values to [0.0, 1.0] to prevent overflow.
fn calculate_from_accuracy(&self, accuracy: f32) -> QualiaState {
    // Implementation...
}
```

### ❌ FORBIDDEN (No # Responsibility header):

```rust
/// This struct holds game state.
pub struct GameState { /* ... */ }  // VIOLATION: Missing header
```

---

## 🔧 DEPENDENCY INJECTION WORKFLOW (5 Steps)

### Step 1: Define Interface Trait

```rust
// backend/src/services/interfaces/i_logger.rs
use shaku::Interface;

/// # Responsibility
/// Provides structured logging throughout the application.
pub trait ILogger: Interface {
    fn info(&self, message: &str);
    fn warn(&self, message: &str);
    fn error(&self, message: &str);
}
```

### Step 2: Implement with #[Component]

```rust
// backend/src/services/logger.rs
use shaku::Component;
use tracing;
use super::interfaces::ILogger;

/// # Responsibility
/// Implements ILogger by forwarding to tracing macros.
#[derive(Component)]
#[shaku(interface = ILogger)]
pub struct QualiaLogger;

impl ILogger for QualiaLogger {
    fn info(&self, message: &str) {
        tracing::info!("{}", message);
    }
    
    fn warn(&self, message: &str) {
        tracing::warn!("{}", message);
    }
    
    fn error(&self, message: &str) {
        tracing::error!("{}", message);
    }
}
```

### Step 3: Register in Shaku Module

```rust
// backend/src/services/mod.rs
use shaku::module;

module! {
    pub GameModule {
        components = [
            QualiaLogger,
            EventBusService,
            GameLogicService,
        ],
        providers = []
    }
}
```

### Step 4: Inject into Dependent Service

```rust
// backend/src/services/game_logic.rs
use shaku::Component;
use std::sync::Arc;
use super::interfaces::{ILogger, IEventBus};

#[derive(Component)]
#[shaku(interface = IGameLogicService)]
pub struct GameLogicService {
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,  // Injected automatically!
    
    #[shaku(inject)]
    event_bus: Arc<dyn IEventBus>,
}
```

### Step 5: Resolve and Use

```rust
// backend/src/main.rs
#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let module = GameModule::builder().build();
    
    let game_logic: Arc<dyn IGameLogicService> = module.resolve();
    
    // Use service...
    game_logic.process_action(action).await?;
    
    Ok(())
}
```

---

## ⚡ EVENTBUS USAGE (tokio::sync::broadcast)

### Pattern 1: Creating the EventBus

```rust
// backend/src/services/event_bus.rs
use tokio::sync::broadcast;
use shared_core::events::GameEvent;
use shaku::Component;

#[derive(Component)]
#[shaku(interface = IEventBus)]
pub struct EventBusService {
    tx: broadcast::Sender<GameEvent>,
}

impl EventBusService {
    pub fn new(capacity: usize) -> Self {
        let (tx, _rx) = broadcast::channel(capacity);
        Self { tx }
    }
}

impl IEventBus for EventBusService {
    fn emit(&self, event: GameEvent) -> Result<usize, broadcast::error::SendError<GameEvent>> {
        self.tx.send(event)  // Lock-free!
    }
    
    fn subscribe(&self) -> broadcast::Receiver<GameEvent> {
        self.tx.subscribe()
    }
}
```

### Pattern 2: Emitting Events

```rust
use shared_core::events::GameEvent;
use tracing::warn;

pub struct SomeService {
    event_bus: Arc<dyn IEventBus>,
}

impl SomeService {
    pub async fn do_something(&self) -> Result<()> {
        // Do work...
        
        // Emit event (fire-and-forget)
        let event = GameEvent::PlayerAction(action);
        match self.event_bus.emit(event) {
            Ok(subscriber_count) => {
                tracing::info!("Event sent to {} subscribers", subscriber_count);
            }
            Err(e) => {
                warn!("No active subscribers: {:?}", e);
            }
        }
        
        Ok(())
    }
}
```

### Pattern 3: Subscribing to Events

```rust
pub struct BossAIService {
    event_bus: Arc<dyn IEventBus>,
}

impl BossAIService {
    pub async fn start(&self) -> Result<()> {
        let event_bus = self.event_bus.clone();
        
        tokio::spawn(async move {
            let mut events = event_bus.subscribe();
            
            loop {
                match events.recv().await {
                    Ok(GameEvent::QualiaStateUpdated(state)) => {
                        // React to qualia changes
                        adapt_behavior(state).await;
                    }
                    Ok(GameEvent::PlayerAction(action)) => {
                        // React to player actions
                        counter_attack(action).await;
                    }
                    Err(broadcast::error::RecvError::Lagged(skipped)) => {
                        warn!("Lagging! Skipped {} events", skipped);
                        // Handle gracefully: catch up or reset
                    }
                    Err(broadcast::error::RecvError::Closed) => {
                        break;  // EventBus dropped, exit gracefully
                    }
                    _ => {}
                }
            }
        });
        
        Ok(())
    }
}
```

### ❌ ANTI-PATTERN (FORBIDDEN):

```rust
// NEVER do this:
pub struct BadEventBus {
    subscribers: Arc<RwLock<Vec<Sender<GameEvent>>>>,  // Lock contention!
}
// Use tokio::sync::broadcast instead!
```

---

## 🧪 TESTING PHILOSOPHY: Useful vs Useless Tests

### ❌ USELESS TESTS (Don't Write These)

```rust
// Test 1: Testing trivial getters (adds no value)
#[test]
fn test_get_intensity_returns_intensity() {
    let state = QualiaState { intensity: 0.5, harmony: 0.0, chaos: 0.0, kairos: 0.0 };
    assert_eq!(state.intensity, 0.5);  // This is just a field access!
}

// Test 2: Testing only happy path (missing error cases)
#[test]
fn test_emit_succeeds_with_valid_event() {
    let bus = EventBusService::new(100);
    let event = GameEvent::PlayerAction(..);
    assert!(bus.emit(event).is_ok());  // What if no subscribers? What if lagging?
}

// Test 3: Testing implementation details (brittle, no value)
#[test]
fn test_logger_calls_tracing_info() {
    // This tests the library (tracing), not your code
}
```

### ✅ USEFUL TESTS (Write These Instead)

**Test 1: Edge Case - Capacity Overflow**

```rust
#[test]
fn test_broadcast_handles_small_capacity_gracefully() {
    let bus = EventBusService::new(2);  // Small capacity
    
    // Fill buffer
    bus.emit(GameEvent::Test1).unwrap();
    bus.emit(GameEvent::Test2).unwrap();
    
    // Overflow: Does it panic or handle gracefully?
    let result = bus.emit(GameEvent::Test3);
    
    // Should succeed (broadcast overwrites oldest)
    assert!(result.is_ok());
    
    // Subscriber should detect lag
    let mut rx = bus.subscribe();
    match rx.try_recv() {
        Err(broadcast::error::TryRecvError::Lagged(n)) => {
            assert!(n > 0, "Should report lagging");
        }
        _ => {}
    }
}
```

**Test 2: Error Path - WebSocket Disconnection**

```rust
#[tokio::test]
async fn test_websocket_reconnects_after_disconnect() {
    let mut ws = WebSocketService::new(config);
    ws.connect().await.unwrap();
    
    // Simulate network failure
    ws.simulate_disconnect().await;
    
    // Does it retry with exponential backoff?
    tokio::time::sleep(Duration::from_millis(100)).await;
    assert!(ws.is_reconnecting(), "Should attempt reconnection");
    
    // Does it eventually succeed?
    let result = tokio::time::timeout(
        Duration::from_secs(5),
        ws.wait_connected()
    ).await;
    
    assert!(result.is_ok(), "Should reconnect within 5 seconds");
}
```

**Test 3: Boundary Condition - Zero Accuracy**

```rust
#[test]
fn test_qualia_calculation_with_zero_accuracy() {
    let calculator = QualiaStateCalculator::new(config);
    
    // What if player has 0% accuracy? Does math break (NaN, Inf)?
    let action = PlayerAction::KeyPressed {
        key: 'A',
        timestamp: 0,
        accuracy: 0.0,  // Edge case!
    };
    
    let state = calculator.process_action(action);
    
    // Should not produce NaN or Inf
    assert!(state.intensity.is_finite(), "Intensity should be finite");
    assert!(state.harmony.is_finite(), "Harmony should be finite");
    
    // Should clamp to valid range
    assert!(state.intensity >= 0.0 && state.intensity <= 1.0);
    assert!(state.harmony >= 0.0 && state.harmony <= 1.0);
}
```

**Test 4: Integration - Full Event Flow**

```rust
#[tokio::test]
async fn test_full_event_flow_player_action_to_qualia_update() {
    // Create real module (not mocked for integration test)
    let module = create_test_module();
    let event_bus: Arc<dyn IEventBus> = module.resolve();
    let calculator: Arc<dyn IQualiaCalculator> = module.resolve();
    
    // Subscribe to events
    let mut events = event_bus.subscribe();
    
    // Emit player action
    let action = PlayerAction::KeyPressed { accuracy: 0.9, .. };
    event_bus.emit(GameEvent::PlayerAction(action)).unwrap();
    
    // Wait for calculated qualia state
    let received = tokio::time::timeout(
        Duration::from_millis(100),
        async {
            loop {
                if let Ok(GameEvent::QualiaStateUpdated(state)) = events.recv().await {
                    return state;
                }
            }
        }
    ).await;
    
    assert!(received.is_ok(), "Should receive QualiaStateUpdated event");
    let state = received.unwrap();
    assert!(state.intensity > 0.0, "High accuracy should increase intensity");
}
```

### GOLDEN RULE:

**Every test must answer: "What production bug does this prevent?"**

If you can't answer that question, the test is probably useless.

---

## 🧬 MOCKING WITH MOCKALL

### Pattern 1: Creating High-Fidelity Mocks

```rust
// backend/src/services/tests/mocks/logger.rs
use mockall::*;
use super::super::interfaces::ILogger;

mock! {
    /// # Responsibility
    /// High-fidelity mock for ILogger trait, used in unit tests.
    pub Logger {}
    
    impl ILogger for Logger {
        fn info(&self, message: &str);
        fn warn(&self, message: &str);
        fn error(&self, message: &str);
    }
}
```

### Pattern 2: Setting Expectations

```rust
#[test]
fn test_game_logic_logs_on_error() {
    let mut mock_logger = MockLogger::new();
    
    // Expect error() to be called once
    mock_logger
        .expect_error()
        .times(1)
        .withf(|msg: &str| msg.contains("failed"))  // Predicate matching
        .return_const(());  // High-fidelity: return type-safe value
    
    let service = GameLogicService {
        logger: Arc::new(mock_logger),
    };
    
    // Test logic that should trigger error logging...
    
    // Mock will panic if expectations not met
}
```

### Pattern 3: Returning Dynamic Values

```rust
#[test]
fn test_service_handles_event_bus_failure() {
    let mut mock_event_bus = MockEventBus::new();
    
    // Simulate SendError on emit
    mock_event_bus
        .expect_emit()
        .times(1)
        .returning(|_| Err(broadcast::error::SendError(GameEvent::Test)));
    
    let service = SomeService {
        event_bus: Arc::new(mock_event_bus),
    };
    
    // Service should handle error gracefully
    let result = service.do_work();
    assert!(result.is_ok(), "Should handle emit failure gracefully");
}
```

### ❌ ANTI-PATTERN (Low-Fidelity Mock):

```rust
// FORBIDDEN: Bare mock without expectations
let mock = MockLogger::new();  // What does it return? Panic? Undefined?

// CORRECT: High-fidelity with expectations
let mut mock = MockLogger::new();
mock.expect_info().return_const(());  // Type-safe default
```

---

## 🏗️ COMMON PATTERNS

### Pattern: Async Service with Dependencies

```rust
use shaku::Component;
use async_trait::async_trait;
use std::sync::Arc;
use anyhow::Result;

#[async_trait]
pub trait IGameLogicService: Interface {
    async fn process_action(&self, action: PlayerAction) -> Result<QualiaState>;
}

#[derive(Component)]
#[shaku(interface = IGameLogicService)]
pub struct GameLogicService {
    config: Arc<GameLogicConfig>,
    
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,
    
    #[shaku(inject)]
    event_bus: Arc<dyn IEventBus>,
}

#[async_trait]
impl IGameLogicService for GameLogicService {
    async fn process_action(&self, action: PlayerAction) -> Result<QualiaState> {
        self.logger.info("Processing action");
        
        // Calculate state...
        let new_state = self.calculate(action);
        
        // Emit event
        self.event_bus.emit(GameEvent::QualiaStateUpdated(new_state))?;
        
        Ok(new_state)
    }
}
```

### Pattern: Configuration Loading

```rust
use serde::Deserialize;
use anyhow::{Context, Result};

#[derive(Debug, Clone, Deserialize)]
pub struct GameLogicConfig {
    pub intensity_multiplier: f32,
    pub harmony_decay_rate: f32,
}

impl GameLogicConfig {
    pub fn load() -> Result<Self> {
        let config_path = std::env::var("CONFIG_PATH")
            .unwrap_or_else(|_| "config/game_logic.yaml".to_string());
        
        let contents = std::fs::read_to_string(&config_path)
            .context(format!("Failed to read config: {}", config_path))?;
        
        let config: Self = serde_yaml::from_str(&contents)
            .context("Failed to parse YAML config")?;
        
        Ok(config)
    }
}
```

### Pattern: Error Handling with anyhow

```rust
use anyhow::{Result, Context, bail};

pub async fn complex_operation() -> Result<()> {
    // Propagate errors with context
    let data = load_data()
        .await
        .context("Failed to load initial data")?;
    
    // Early return on condition
    if data.is_empty() {
        bail!("Data is empty, cannot proceed");
    }
    
    // Chain operations
    process(data)
        .await
        .context("Failed to process data")?;
    
    Ok(())
}
```

---

## ⚠️ COMMON PITFALLS (Don't Do This)

| Anti-Pattern | Why Bad | Correct Pattern |
|--------------|---------|-----------------|
| `Arc<RwLock<Vec<...>>>` for EventBus | Lock contention under load | `tokio::sync::broadcast` |
| Manual mock implementation | No compile-time verification | `mockall::mock!` |
| `println!` for logging | Not structured, no filtering | `tracing` macros |
| Missing `# Responsibility` header | Poor documentation | Add header to all public types |
| `unwrap()` in service code | Panics on error | Use `?` with `Result` |
| Direct `std::thread` | Blocks async runtime | Use `tokio::spawn` |
| No test isolation | Cross-contamination | Use `create_test_module()` per test |

---

## 🚀 QUICK START CHECKLIST

When creating a new service:

1. [ ] Define trait in `services/interfaces/i_service_name.rs` with `# Responsibility`
2. [ ] Implement with `#[derive(Component)]` and `#[shaku(interface = ...)]`
3. [ ] Add to `GameModule` components list
4. [ ] Create config struct in `config.rs` if needed
5. [ ] Inject dependencies with `#[shaku(inject)]`
6. [ ] Add `# Responsibility` docstrings to all public items
7. [ ] Create mock in `tests/mocks/mock_service_name.rs`
8. [ ] Write unit tests using `create_test_module()`
9. [ ] Write at least one integration test for critical path
10. [ ] Verify tests answer: "What production bug does this prevent?"

---

## 📚 ADDITIONAL RESOURCES

- **Architectural Laws**: `@docs/QUALIA.CODE.RUST.md`
- **Full Implementation Examples**: `@docs/QUALIA.MANUAL.RUST.md`
- **System Design**: `@docs/ARCHITECTURE.RUST.md`
- **Audit Report**: `@docs/AUDIT_RUST_CORRECTIONS.md`

---

*"From principles to practice. From architecture to code. From broadcast channels to tested services."*

**END OF RUST QUICK REFERENCE v1.0**
