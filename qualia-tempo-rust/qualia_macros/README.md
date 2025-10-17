# qualia_macros

**Procedural Macros for Qualia Tempo Rust Rewrite**

## Responsibility

Provides procedural macros that enforce architectural patterns and reduce boilerplate throughout the Qualia Tempo codebase. These macros replace decorators from the TypeScript/Python prototype with compile-time code generation.

## Available Macros

### `#[handle_event(EventVariant)]`

**Purpose**: Automatically generates tokio spawn loop + EventBus subscription for event handlers.

**Usage**:
```rust
use qualia_macros::handle_event;

impl MyService {
    #[handle_event(GameEvent::QualiaStateUpdated)]
    async fn on_qualia_update(&self, state: QualiaState) -> Result<()> {
        // Your handler logic
        Ok(())
    }
}
```

**Generated Code**:
- Creates `on_qualia_update_handler(&self) -> JoinHandle<()>` function
- Spawns tokio task that subscribes to EventBus
- Automatically filters for specified event type
- Handles lag detection with logging
- Handles graceful shutdown on EventBus close

### `#[instrument]`

**Purpose**: Adds tracing instrumentation to functions.

**Usage**:
```rust
#[instrument]
async fn process_data(&self, input: Data) -> Result<Output> {
    // Logic
}
```

### `#[cached(ttl = seconds)]`

**Purpose**: Memoizes function results (stub implementation).

### `#[retry(max_attempts = n, delay_ms = n, exponential_backoff = bool)]`

**Purpose**: Adds automatic retry logic (stub implementation).

### `#[timeout(milliseconds)]`

**Purpose**: Wraps async functions with timeout protection (stub implementation).

## Architecture Compliance

- **QUALIA.CODE.RUST v1.1**: All macros follow documented architectural patterns
- **# Responsibility Headers**: All public items documented per standard
- **Zero Unwrap**: All error handling uses Result<T, E>
- **Lock-Free EventBus**: Generated code uses `tokio::sync::broadcast`

## Testing

Run tests with:
```bash
cargo test --package qualia_macros
```

Verify macro expansion with:
```bash
cargo expand --package qualia_macros
```

## Status

- ✅ `#[handle_event]`: Fully implemented
- ✅ `#[instrument]`: Fully implemented
- ⚠️  `#[cached]`: Stub (pass-through)
- ⚠️  `#[retry]`: Stub (pass-through)
- ⚠️  `#[timeout]`: Stub (pass-through)
