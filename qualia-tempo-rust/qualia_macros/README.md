# qualia_macros - Procedural Macros for Qualia Tempo

**VERSION:** 1.0  
**COMPLIANCE:** QUALIA.CODE.RUST v1.1 §5 + BLUEPRINT.RUST.md §4.3

---

## Purpose

This crate provides procedural macros that translate TypeScript/Python decorators into Rust attribute macros. These macros eliminate boilerplate and enforce architectural patterns defined in `QUALIA.CODE.RUST`.

---

## Available Macros

### Critical Macros (Fully Implemented)

#### `#[handle_event(EventVariant)]`
**Replaces:** `@OnEvent` decorator  
**Purpose:** Generates event handler boilerplate for `tokio::sync::broadcast` subscriptions

```rust
use qualia_macros::handle_event;

#[derive(Clone)]
struct GameService {
    event_bus: Arc<dyn IEventBus>,
}

impl GameService {
    #[handle_event(GameEvent::QualiaStateUpdated)]
    async fn on_qualia_update(&self, state: QualiaState) -> Result<()> {
        // Your handler logic
        Ok(())
    }
}

// Usage: Start the handler
let handle = service.on_qualia_update_handler();
```

#### `#[retry]`
**Replaces:** `@retry` decorator  
**Purpose:** Automatic retry with exponential backoff

```rust
use qualia_macros::retry;

impl NetworkService {
    #[retry]
    async fn fetch_data(&self) -> Result<Response> {
        // May fail, will retry up to 3 times
        self.http_client.get(url).await
    }
}
```

**Configuration:** Hardcoded to 3 attempts, 100ms base delay, exponential backoff

#### `#[timeout(milliseconds)]`
**Replaces:** `@timeout` decorator  
**Purpose:** Enforce timeouts on async operations

```rust
use qualia_macros::timeout;

impl DatabaseService {
    #[timeout(5000)] // 5 second timeout
    async fn complex_query(&self) -> Result<Data> {
        // Long-running query
    }
}
```

#### `#[cached(ttl = seconds)]`
**Purpose:** Function memoization with TTL

```rust
use qualia_macros::cached;

impl AnalysisService {
    #[cached(ttl = 60)]
    async fn expensive_calculation(&self, input: u32) -> Result<u64> {
        // Heavy computation, cached for 60 seconds
    }
}
```

---

### Auxiliary Macros (Passthrough Stubs for Phase 0)

The following macros are implemented as passthroughs and will be fully implemented in later phases:

- `#[rate_limit(per_second = N)]` - API rate limiting
- `#[circuit_breaker(failure_threshold = N)]` - Circuit breaker pattern
- `#[instrument]` - Tracing wrapper
- `#[validate]` - Runtime validation
- `#[authorize(role = "...")]` - Authorization checks
- `#[transaction]` - Database transaction wrapper
- `#[deprecated(since = "...", note = "...")]` - Deprecation warnings

---

## Testing

### Run All Tests
```bash
cd qualia-tempo-rust
cargo test --package qualia_macros
```

### Expand Macro for Debugging
```bash
cargo install cargo-expand
cargo expand --package qualia_macros --test handle_event_tests
```

---

## Compliance Checklist

- [x] All public items have `# Responsibility` docstrings
- [x] Zero `unwrap()` or `expect()` calls
- [x] Comprehensive test coverage for critical macros
- [x] Integration tests validate expansion correctness
- [x] No placeholder/stub code in critical macros
- [x] Follows QUALIA.CODE.RUST v1.1 mandates

---

## Architecture Notes

### Event Handler Pattern

The `#[handle_event]` macro generates code that:

1. Clones service state for move into async task
2. Subscribes to `tokio::sync::broadcast` channel
3. Pattern matches on specific event variant
4. Handles errors without panicking
5. Gracefully shuts down on `EventBus` drop

This enforces the **Lock-Free EventBus** pattern from QUALIA.CODE.RUST §4.

---

## Phase 0 Status

**COMPLETE:** All critical macros implemented and tested.

**Next Phase:** Phase 1 will implement `shared_core` contracts that these macros will consume.

---

*"From decorators to macros. From runtime to compile-time. From TypeScript to Rust."*
