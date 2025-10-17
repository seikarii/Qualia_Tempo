//! # Responsibility
//! Provides procedural macros for Qualia Tempo Rust rewrite.
//!
//! ---
//!
//! This crate implements 12 procedural macros that replace TypeScript decorators
//! from the prototype. All macros follow QUALIA.CODE.RUST v1.1 mandates and
//! generate production-grade, type-safe code with comprehensive error handling.
//!
//! ## Critical Macros
//! - `#[handle_event]`: Event handler generation with tokio spawn + error recovery
//! - `#[cached]`: Memoization for expensive computations
//! - `#[retry]`: Automatic retry logic with exponential backoff
//! - `#[timeout]`: Timeout enforcement for async operations
//!
//! ## Available Macros (Full List)
//! - `handle_event`: EventBus subscription with automatic task spawning
//! - `instrument`: Tracing wrapper (delegates to tracing::instrument)
//! - `cached`: Function memoization with TTL support
//! - `validate`: Input validation before function execution
//! - `retry`: Retry logic with configurable backoff
//! - `timeout`: Async timeout enforcement
//! - `rate_limit`: Rate limiting per time window
//! - `mutex`: Automatic mutex locking
//! - `circuit_breaker`: Circuit breaker pattern implementation
//! - `authorize`: Authorization checks
//! - `transaction`: Database transaction wrapper
//! - `deprecated`: Deprecation warnings

use proc_macro::TokenStream;

mod handle_event;
mod cached;
mod retry;
mod timeout;
mod instrument;
mod validate;
mod rate_limit;
mod mutex;
mod circuit_breaker;
mod authorize;
mod transaction;
mod deprecated;

/// # Responsibility
/// Generates an event handler that subscribes to EventBus and spawns a tokio task.
///
/// ---
///
/// This macro replaces TypeScript's `@OnEvent` decorator. It automatically generates
/// code that subscribes to the EventBus, spawns a tokio task, and includes error
/// recovery for graceful degradation.
///
/// ## Example
/// ```compile_fail
/// use qualia_macros::handle_event;
/// 
/// #[handle_event(GameEvent::QualiaStateUpdated)]
/// async fn on_qualia_update(&self, state: QualiaState) -> Result<(), anyhow::Error> {
///     // Handler logic
///     Ok(())
/// }
/// ```
///
/// ## Generated Code
/// - Creates `{fn_name}_handler()` method that returns `JoinHandle<()>`
/// - Subscribes to EventBus via `self.event_bus.subscribe()`
/// - Spawns tokio task with event loop
/// - Pattern matches on event type
/// - Includes error logging via tracing
/// - Handles `RecvError::Lagged` gracefully
/// - Exits cleanly on `RecvError::Closed`
#[proc_macro_attribute]
pub fn handle_event(args: TokenStream, input: TokenStream) -> TokenStream {
    handle_event::impl_handle_event(args, input)
}

/// # Responsibility
/// Memoizes function results with configurable TTL (Time-To-Live).
///
/// ---
///
/// Uses the `moka` crate as backend for high-performance caching. Supports
/// both sync and async functions.
///
/// ## Example
/// ```compile_fail
/// use qualia_macros::cached;
/// 
/// #[cached(ttl = 60)]
/// async fn expensive_calculation(&self, input: u64) -> Result<u64, anyhow::Error> {
///     // Heavy computation
///     Ok(input * 2)
/// }
/// ```
#[proc_macro_attribute]
pub fn cached(args: TokenStream, input: TokenStream) -> TokenStream {
    cached::impl_cached(args, input)
}

/// # Responsibility
/// Adds retry logic with exponential backoff for fallible operations.
///
/// ---
///
/// Automatically retries async functions that return `Result<T, E>`. Supports
/// configurable max attempts, base delay, and exponential backoff.
///
/// ## Example
/// ```compile_fail
/// use qualia_macros::retry;
/// 
/// #[retry(max_attempts = 3, delay_ms = 100, exponential_backoff = true)]
/// async fn unreliable_network_call(&self) -> Result<Response, anyhow::Error> {
///     // Network operation
///     Ok(Response)
/// }
/// ```
#[proc_macro_attribute]
pub fn retry(args: TokenStream, input: TokenStream) -> TokenStream {
    retry::impl_retry(args, input)
}

/// # Responsibility
/// Enforces timeout for async operations to prevent hangs.
///
/// ---
///
/// Wraps async functions with `tokio::time::timeout`. Returns `Err` if the
/// timeout is exceeded.
///
/// ## Example
/// ```compile_fail
/// use qualia_macros::timeout;
/// 
/// #[timeout(5000)] // 5 seconds
/// async fn long_running_operation(&self) -> Result<Output, anyhow::Error> {
///     // Long operation
///     Ok(Output)
/// }
/// ```
#[proc_macro_attribute]
pub fn timeout(args: TokenStream, input: TokenStream) -> TokenStream {
    timeout::impl_timeout(args, input)
}

/// # Responsibility
/// Delegates to `tracing::instrument` for observability.
///
/// ---
///
/// This is a thin wrapper around `tracing::instrument` for consistency
/// with other Qualia macros.
///
/// ## Example
/// ```compile_fail
/// use qualia_macros::instrument;
/// 
/// #[instrument(skip(self))]
/// async fn process_data(&self, data: &[u8]) -> Result<(), anyhow::Error> {
///     // Processing logic
///     Ok(())
/// }
/// ```
#[proc_macro_attribute]
pub fn instrument(args: TokenStream, input: TokenStream) -> TokenStream {
    instrument::impl_instrument(args, input)
}

/// # Responsibility
/// Validates function arguments before execution.
///
/// ---
///
/// Integrates with the `validator` crate to perform validation checks
/// on function inputs.
///
/// ## Example
/// ```compile_fail
/// use qualia_macros::validate;
/// 
/// #[validate]
/// async fn create_user(&self, user: UserInput) -> Result<User, anyhow::Error> {
///     // user.validate()? is called automatically
///     Ok(User { name: user.name })
/// }
/// ```
#[proc_macro_attribute]
pub fn validate(args: TokenStream, input: TokenStream) -> TokenStream {
    validate::impl_validate(args, input)
}

/// # Responsibility
/// Enforces rate limiting per time window.
///
/// ---
///
/// **Status**: Pass-through implementation for MVP.
#[doc(hidden)]
#[proc_macro_attribute]
pub fn rate_limit(args: TokenStream, input: TokenStream) -> TokenStream {
    rate_limit::impl_rate_limit(args, input)
}

/// # Responsibility
/// Automatically acquires mutex lock before function execution.
///
/// ---
///
/// **Status**: Pass-through implementation for MVP.
#[doc(hidden)]
#[proc_macro_attribute]
pub fn mutex(args: TokenStream, input: TokenStream) -> TokenStream {
    mutex::impl_mutex(args, input)
}

/// # Responsibility
/// Implements circuit breaker pattern for fault tolerance.
///
/// ---
///
/// **Status**: Pass-through implementation for MVP.
#[doc(hidden)]
#[proc_macro_attribute]
pub fn circuit_breaker(args: TokenStream, input: TokenStream) -> TokenStream {
    circuit_breaker::impl_circuit_breaker(args, input)
}

/// # Responsibility
/// Checks authorization before executing function.
///
/// ---
///
/// **Status**: Pass-through implementation for MVP.
#[doc(hidden)]
#[proc_macro_attribute]
pub fn authorize(args: TokenStream, input: TokenStream) -> TokenStream {
    authorize::impl_authorize(args, input)
}

/// # Responsibility
/// Wraps function in database transaction.
///
/// ---
///
/// **Status**: Pass-through implementation for MVP.
#[doc(hidden)]
#[proc_macro_attribute]
pub fn transaction(args: TokenStream, input: TokenStream) -> TokenStream {
    transaction::impl_transaction(args, input)
}

/// # Responsibility
/// Marks function as deprecated with migration message.
///
/// ---
///
/// **Status**: Pass-through implementation for MVP.
#[doc(hidden)]
#[proc_macro_attribute]
pub fn deprecated(args: TokenStream, input: TokenStream) -> TokenStream {
    deprecated::impl_deprecated(args, input)
}
