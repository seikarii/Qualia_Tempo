//! # Responsibility
//! Provides procedural macros for the Qualia Tempo Rust rewrite.
//!
//! ---
//!
//! This crate contains 8 production-ready procedural macros that replace
//! TypeScript decorators and provide Rust-native implementations for common
//! patterns: event handling, caching, validation, retries, timeouts, rate
//! limiting, circuit breakers, and authorization.
//!
//! ## Available Macros
//!
//! - `#[handle_event(EventVariant)]` - Event bus subscription boilerplate
//! - `#[cached]` - Memoization with TTL support
//! - `#[validate]` - Runtime validation using validator crate
//! - `#[retry(max_attempts, delay_ms)]` - Exponential backoff retry logic
//! - `#[with_timeout(ms)]` - Async timeout wrapper
//! - `#[rate_limit(calls_per_sec)]` - Token bucket rate limiting
//! - `#[circuit_breaker]` - Circuit breaker pattern implementation
//! - `#[authorize(role)]` - Authorization checking
//!
//! ## Compliance
//!
//! All macros comply with QUALIA.CODE.RUST v1.1 mandates:
//! - No `unwrap()` in generated code
//! - Use `tracing` for logging, not `println!`
//! - Proper error handling with `anyhow::Result`
//! - Full documentation with examples
//!
//! ## Example Usage
//!
//! ```rust,ignore
//! use qualia_macros::handle_event;
//!
//! #[handle_event(GameEvent::QualiaStateUpdated)]
//! async fn on_qualia_updated(state: QualiaState) -> anyhow::Result<()> {
//!     // Handle the event
//!     Ok(())
//! }
//! ```

use proc_macro::TokenStream;

mod handle_event;
mod cached_macro;
mod validate_macro;
mod retry_macro;
mod timeout_macro;
mod rate_limit_macro;
mod circuit_breaker_macro;
mod authorize_macro;

/// # Responsibility
/// Generates async event subscription boilerplate for EventBus integration.
///
/// ---
///
/// This macro automatically:
/// - Spawns a tokio task for event listening
/// - Subscribes to the EventBus
/// - Pattern matches the specified event variant
/// - Handles errors with tracing::error!
/// - Gracefully shuts down on EventBus closure
///
/// ## Arguments
///
/// - Event variant to handle (e.g., `GameEvent::QualiaStateUpdated`)
///
/// ## Example
///
/// ```rust,ignore
/// #[handle_event(GameEvent::PlayerAction)]
/// async fn on_player_action(action: PlayerAction) -> anyhow::Result<()> {
///     tracing::info!("Received action: {:?}", action);
///     Ok(())
/// }
/// ```
#[proc_macro_attribute]
pub fn handle_event(args: TokenStream, input: TokenStream) -> TokenStream {
    handle_event::impl_handle_event(args, input)
}

/// # Responsibility
/// Generates memoization logic with TTL support using the `cached` crate.
///
/// ---
///
/// Caches function results based on argument values. Useful for expensive
/// computations that are called repeatedly with the same inputs.
///
/// ## Example
///
/// ```rust,ignore
/// #[cached]
/// fn expensive_calculation(input: u32) -> u32 {
///     // Heavy computation
///     input * 2
/// }
/// ```
#[proc_macro_attribute]
pub fn cached(_args: TokenStream, input: TokenStream) -> TokenStream {
    cached_macro::impl_cached(input)
}

/// # Responsibility
/// Generates runtime validation logic using the `validator` crate.
///
/// ---
///
/// Validates function arguments or struct fields at runtime, returning
/// `Result<T, ValidationError>` on validation failure.
///
/// ## Example
///
/// ```rust,ignore
/// #[validate]
/// fn create_player(#[validate(range(min = 1, max = 100))] level: u32) -> Player {
///     Player { level }
/// }
/// ```
#[proc_macro_attribute]
pub fn validate(_args: TokenStream, input: TokenStream) -> TokenStream {
    validate_macro::impl_validate(input)
}

/// # Responsibility
/// Generates exponential backoff retry logic for async functions.
///
/// ---
///
/// Automatically retries failed async operations with exponential backoff.
/// Logs each retry attempt using tracing.
///
/// ## Arguments
///
/// - `max_attempts` - Maximum number of retry attempts
/// - `delay_ms` - Base delay in milliseconds (doubles each retry)
///
/// ## Example
///
/// ```rust,ignore
/// #[retry(3, 100)]
/// async fn fetch_data() -> anyhow::Result<Data> {
///     // Network request that may fail
///     Ok(Data {})
/// }
/// ```
#[proc_macro_attribute]
pub fn retry(args: TokenStream, input: TokenStream) -> TokenStream {
    retry_macro::impl_retry(args, input)
}

/// # Responsibility
/// Wraps async functions with tokio::time::timeout.
///
/// ---
///
/// Returns `Err` if the function takes longer than the specified timeout.
/// Logs timeout events using tracing.
///
/// ## Arguments
///
/// - Timeout duration in milliseconds
///
/// ## Example
///
/// ```rust,ignore
/// #[with_timeout(5000)]
/// async fn load_config() -> anyhow::Result<Config> {
///     // Must complete within 5 seconds
///     Ok(Config::default())
/// }
/// ```
#[proc_macro_attribute]
pub fn with_timeout(args: TokenStream, input: TokenStream) -> TokenStream {
    timeout_macro::impl_with_timeout(args, input)
}

/// # Responsibility
/// Implements token bucket rate limiting for async functions.
///
/// ---
///
/// Limits the rate at which a function can be called. Returns `Err` when
/// the rate limit is exceeded.
///
/// ## Arguments
///
/// - Maximum calls per second
///
/// ## Example
///
/// ```rust,ignore
/// #[rate_limit(10)]
/// async fn api_call() -> anyhow::Result<Response> {
///     // Limited to 10 calls per second
///     Ok(Response {})
/// }
/// ```
#[proc_macro_attribute]
pub fn rate_limit(args: TokenStream, input: TokenStream) -> TokenStream {
    rate_limit_macro::impl_rate_limit(args, input)
}

/// # Responsibility
/// Implements the circuit breaker pattern for async functions.
///
/// ---
///
/// Prevents cascading failures by opening the circuit after a threshold of
/// failures. Automatically tries to close after a recovery period.
///
/// ## Example
///
/// ```rust,ignore
/// #[circuit_breaker]
/// async fn call_external_service() -> anyhow::Result<Data> {
///     // External service call
///     Ok(Data {})
/// }
/// ```
#[proc_macro_attribute]
pub fn circuit_breaker(_args: TokenStream, input: TokenStream) -> TokenStream {
    circuit_breaker_macro::impl_circuit_breaker(input)
}

/// # Responsibility
/// Generates authorization checks before function execution.
///
/// ---
///
/// Verifies that the current user has the required role before executing
/// the function. Returns `Err` if unauthorized.
///
/// ## Arguments
///
/// - Required role (e.g., `"admin"`, `"player"`)
///
/// ## Example
///
/// ```rust,ignore
/// #[authorize("admin")]
/// async fn delete_user(user_id: u32) -> anyhow::Result<()> {
///     // Only admins can execute
///     Ok(())
/// }
/// ```
#[proc_macro_attribute]
pub fn authorize(args: TokenStream, input: TokenStream) -> TokenStream {
    authorize_macro::impl_authorize(args, input)
}
