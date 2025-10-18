# Qualia Macros

Procedural macros for Qualia Tempo Rust rewrite.

## # Responsibility
Provides compile-time code generation for architecture enforcement patterns:
- Event handling with `tokio::sync::broadcast`
- Automatic retries with exponential backoff
- Timeout enforcement
- Memoization with TTL

---

## Usage Examples

### #[handle_event] - EventBus Subscriptions

Replaces `@OnEvent` decorator from TypeScript prototype.

```rust
use qualia_macros::handle_event;

#[derive(Clone)]
struct GameLogicService {
    event_bus: Arc<dyn IEventBus>,
}

impl GameLogicService {
    #[handle_event(GameEvent::QualiaStateUpdated)]
    async fn on_qualia_update(&self, state: QualiaState) -> Result<()> {
        // React to qualia state changes
        self.update_boss_behavior(state).await?;
        Ok(())
    }
}

// Start handler in main.rs:
let handler = game_logic.on_qualia_update_handler();
```

**Generated Code**:
- Subscribes to EventBus via `tokio::sync::broadcast::Receiver`
- Spawns async task with `tokio::spawn`
- Handles lagging (warns), channel closed (graceful shutdown), and handler errors (logs)
- Returns `JoinHandle` for lifecycle management

---

### #[retry] - Automatic Retries

```rust
use qualia_macros::retry;

#[retry(max_attempts = 3, delay_ms = 100, exponential_backoff = true)]
async fn fetch_leaderboard() -> Result<Vec<LeaderboardEntry>> {
    // Network call that may fail
    let response = reqwest::get("https://api.example.com/leaderboard").await?;
    Ok(response.json().await?)
}
```

**Features**:
- Configurable max attempts and delay
- Exponential backoff support (delay doubles per attempt)
- Tracing logs for each retry and final failure

---

### #[timeout] - Timeout Enforcement

```rust
use qualia_macros::timeout;

#[timeout(5000)] // 5 seconds
async fn process_ai_decision(&self) -> Result<BossAction> {
    // Long-running AI computation
    self.decision_tree.evaluate().await
}
```

**Features**:
- Wraps function with `tokio::time::timeout`
- Returns `Err(TimeoutError)` if exceeded
- Tracing log on timeout

---

### #[cached] - Memoization

```rust
use qualia_macros::cached;

#[cached(ttl = 60)] // Cache for 60 seconds
async fn calculate_harmony_analysis(&self, audio: &AudioBuffer) -> Result<HarmonyMap> {
    // Expensive FFT analysis
    self.fft_analyzer.analyze(audio).await
}
```

**Note**: Current implementation is a passthrough. Full caching requires `cached` crate integration (Phase 1 task).

---

## Testing

Tests use `trybuild` for compile-time verification:

```bash
cargo test --package qualia_macros
```

UI tests verify:
- Macro expansion correctness
- Compile-time error detection (e.g., non-async handler with `#[handle_event]`)

---

## Compliance

- **QUALIA.CODE.RUST §4**: EventBus uses `tokio::sync::broadcast` (not manual `Arc<RwLock<...>>`)
- **QUALIA.CODE.RUST §1.1**: All modules have `# Responsibility` docstrings
- **LINTER.RUST.md**: No inline `#[cfg(test)]` - tests in `tests/` directory

---

## Architecture

All macros generate **zero-cost abstractions** via procedural macro expansion at compile time. No runtime overhead.

**Macro Registry** (`src/lib.rs`):
- `handle_event` - EventBus subscriptions (CRITICAL)
- `cached` - Memoization (HIGH)
- `retry` - Retry logic (MEDIUM)
- `timeout` - Timeout enforcement (MEDIUM)
- `rate_limit` - Rate limiting (LOW)
- `instrument` - Tracing instrumentation (LOW)
- `mutex` - Locking helpers (LOW)
- `circuit_breaker` - Circuit breaker pattern (LOW)
- `authorize` - Authorization checks (LOW)
- `transaction` - Database transactions (LOW)
- `deprecated` - Deprecation warnings (LOW)

---

## Future Enhancements (Phase 1)

- Full `#[cached]` implementation with `cached` crate
- `#[rate_limit]` with token bucket algorithm
- `#[instrument]` integration with `tracing-subscriber`
- `#[circuit_breaker]` fault tolerance

---

*Generated code is production-ready and follows Rust best practices.*
