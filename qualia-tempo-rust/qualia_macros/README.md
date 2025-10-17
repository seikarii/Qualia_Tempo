# Qualia Macros

## Responsibility

Provides procedural macros for infrastructure patterns in Qualia Tempo.

---

## Available Macros

### `#[handle_event(EventType)]`

**Purpose**: Generates event handler with automatic EventBus subscription.

**Example**:
```rust
use qualia_macros::handle_event;

#[handle_event(GameEvent::QualiaStateUpdated)]
async fn on_qualia_update(&self, state: QualiaState) -> anyhow::Result<()> {
    self.logger.info("Processing qualia state");
    Ok(())
}

// Usage: Spawns background task
let handle = service.on_qualia_update_handler();
```

**Generated Code**:
- Tokio spawn with event loop
- Pattern matching for specific event type
- Error handling (no panics)
- Lag detection and logging
- Graceful shutdown

---

### `#[cached(ttl = 60)]`

**Purpose**: Memoization for expensive computations.

**Example**:
```rust
use qualia_macros::cached;

#[cached(ttl = 60)]
async fn expensive_calculation(&self, input: ComplexInput) -> Result<Output> {
    // Heavy computation
}
```

**Note**: Full caching implementation requires runtime integration. Phase 0 provides skeleton.

---

### `#[retry(max_attempts = 3, delay_ms = 100, exponential_backoff = true)]`

**Purpose**: Automatic retry logic for unreliable operations.

**Example**:
```rust
use qualia_macros::retry;

#[retry(max_attempts = 3, delay_ms = 100, exponential_backoff = true)]
async fn unreliable_network_call(&self) -> Result<Response> {
    // Network operation
}
```

**Features**:
- Configurable max attempts
- Exponential or linear backoff
- Structured logging of retry attempts

---

### `#[timeout(5000)]`

**Purpose**: Timeout protection for async operations.

**Example**:
```rust
use qualia_macros::timeout;

#[timeout(5000)] // 5 seconds
async fn long_running_operation(&self) -> Result<Output> {
    // Long operation
}
```

**Features**:
- Wraps with tokio::time::timeout
- Descriptive error on timeout
- Configurable duration in milliseconds

---

### `#[instrument]`

**Purpose**: Tracing instrumentation wrapper.

**Example**:
```rust
use qualia_macros::instrument;

#[instrument]
async fn process_game_logic(&self) -> Result<()> {
    // Automatically traced
}
```

**Features**:
- Standardized observability
- Entry/exit span logging
- Consistent with Qualia patterns

---

## Testing

Run tests with:
```bash
cargo test --package qualia_macros
```

Inspect macro expansions with:
```bash
cargo expand --package qualia_macros
```

---

## Compliance

- **QUALIA.CODE.RUST v1.1**: All macros follow architectural mandates
- **Documentation**: `# Responsibility` headers on all public items
- **Error Handling**: No panics, structured errors with anyhow
- **Testing**: High-fidelity expansion tests

---

*"From decorators to macros. From runtime to compile-time."*
