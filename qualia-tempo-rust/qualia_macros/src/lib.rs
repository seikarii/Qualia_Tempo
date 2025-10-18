//! # Responsibility
//! Provides procedural macros for Qualia Tempo infrastructure patterns.
//!
//! ---
//!
//! This crate contains all custom derive macros and attribute macros that
//! enable declarative patterns throughout the codebase. These macros replace
//! TypeScript decorators and Python decorators from the prototype.
//!
//! ## Available Macros
//!
//! - `#[handle_event]`: Generates event handler with tokio::spawn + error handling
//! - `#[cached]`: Memoization for expensive computations
//! - `#[retry]`: Automatic retry logic with exponential backoff
//! - `#[timeout]`: Timeout protection for async operations
//! - `#[rate_limit]`: Rate limiting for API endpoints
//! - `#[instrument]`: Tracing instrumentation (thin wrapper)

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
/// Generates an event handler that spawns a tokio task and listens to EventBus.
///
/// ---
///
/// This macro transforms an async method into a full event subscription handler
/// with automatic error recovery, lag detection, and graceful shutdown.
///
/// ## Example
///
/// ```ignore
/// #[handle_event(GameEvent::QualiaStateUpdated)]
/// async fn on_qualia_update(&self, state: QualiaState) -> anyhow::Result<()> {
///     self.logger.info("Processing qualia state");
///     Ok(())
/// }
/// ```
///
/// ## Generated Code
///
/// The macro generates a public method `{original_name}_handler` that returns
/// a `JoinHandle<()>` and manages the event subscription lifecycle.
#[proc_macro_attribute]
pub fn handle_event(attr: TokenStream, item: TokenStream) -> TokenStream {
    handle_event::expand(attr, item)
}

/// # Responsibility
/// Provides automatic memoization for expensive computations.
///
/// ---
///
/// Caches function results based on input parameters. Supports TTL-based
/// expiration for time-sensitive data.
///
/// ## Example
///
/// ```ignore
/// #[cached(ttl = 60)]
/// async fn expensive_calculation(&self, input: ComplexInput) -> Result<Output> {
///     // Heavy computation here
/// }
/// ```
#[proc_macro_attribute]
pub fn cached(attr: TokenStream, item: TokenStream) -> TokenStream {
    cached::expand(attr, item)
}

/// # Responsibility
/// Adds automatic retry logic with exponential backoff.
///
/// ---
///
/// Retries failed operations with configurable delay and backoff strategy.
/// Essential for network operations and unreliable external services.
///
/// ## Example
///
/// ```ignore
/// #[retry(max_attempts = 3, delay_ms = 100, exponential_backoff = true)]
/// async fn unreliable_network_call(&self) -> Result<Response> {
///     // Network operation
/// }
/// ```
#[proc_macro_attribute]
pub fn retry(attr: TokenStream, item: TokenStream) -> TokenStream {
    retry::expand(attr, item)
}

/// # Responsibility
/// Adds timeout protection to prevent operations from hanging indefinitely.
///
/// ---
///
/// Wraps async functions with tokio::time::timeout to enforce maximum
/// execution duration.
///
/// ## Example
///
/// ```ignore
/// #[timeout(5000)] // 5 seconds
/// async fn long_running_operation(&self) -> Result<Output> {
///     // Long operation
/// }
/// ```
#[proc_macro_attribute]
pub fn timeout(attr: TokenStream, item: TokenStream) -> TokenStream {
    timeout::expand(attr, item)
}

/// # Responsibility
/// Wraps functions with tracing instrumentation spans.
///
/// ---
///
/// Thin wrapper around `#[tracing::instrument]` for consistency with
/// other Qualia macros.
///
/// ## Example
///
/// ```ignore
/// #[instrument]
/// async fn process_game_logic(&self) -> Result<()> {
///     // Automatically traced
/// }
/// ```
#[proc_macro_attribute]
pub fn instrument(attr: TokenStream, item: TokenStream) -> TokenStream {
    instrument::expand(attr, item)
}

/// # Responsibility
/// Adds input validation checks before function execution.
///
/// ---
///
/// Generates validation logic using the validator crate.
///
/// ## Example
///
/// ```ignore
/// #[validate]
/// async fn create_user(&self, username: String) -> Result<User> {
///     // Validation happens automatically
/// }
/// ```
#[proc_macro_attribute]
pub fn validate(attr: TokenStream, item: TokenStream) -> TokenStream {
    validate::expand(attr, item)
}

/// # Responsibility
/// Adds rate limiting to prevent resource exhaustion.
///
/// ---
///
/// Enforces maximum call rate per time window.
///
/// ## Example
///
/// ```ignore
/// #[rate_limit(per_second = 10)]
/// async fn expensive_api_call(&self) -> Result<Response> {
///     // Rate limited automatically
/// }
/// ```
#[proc_macro_attribute]
pub fn rate_limit(attr: TokenStream, item: TokenStream) -> TokenStream {
    rate_limit::expand(attr, item)
}

/// # Responsibility
/// Wraps function execution in a tokio::sync::Mutex.
///
/// ---
///
/// Ensures exclusive access to critical sections.
#[proc_macro_attribute]
pub fn mutex(attr: TokenStream, item: TokenStream) -> TokenStream {
    mutex::expand(attr, item)
}

/// # Responsibility
/// Implements circuit breaker pattern for fault tolerance.
///
/// ---
///
/// Prevents cascading failures by breaking circuit after threshold.
///
/// ## Example
///
/// ```ignore
/// #[circuit_breaker(failure_threshold = 5)]
/// async fn unreliable_service_call(&self) -> Result<Data> {
///     // Circuit breaker protects against cascading failures
/// }
/// ```
#[proc_macro_attribute]
pub fn circuit_breaker(attr: TokenStream, item: TokenStream) -> TokenStream {
    circuit_breaker::expand(attr, item)
}

/// # Responsibility
/// Adds authorization checks before function execution.
///
/// ---
///
/// Verifies user permissions before allowing access.
///
/// ## Example
///
/// ```ignore
/// #[authorize(role = "admin")]
/// async fn delete_user(&self, user_id: String) -> Result<()> {
///     // Only admins can execute this
/// }
/// ```
#[proc_macro_attribute]
pub fn authorize(attr: TokenStream, item: TokenStream) -> TokenStream {
    authorize::expand(attr, item)
}

/// # Responsibility
/// Wraps database operations in transactions.
///
/// ---
///
/// Automatically handles begin/commit/rollback.
#[proc_macro_attribute]
pub fn transaction(attr: TokenStream, item: TokenStream) -> TokenStream {
    transaction::expand(attr, item)
}

/// # Responsibility
/// Marks functions as deprecated with custom messages.
///
/// ---
///
/// Extended deprecation warnings for migration paths.
///
/// ## Example
///
/// ```ignore
/// #[deprecated(since = "1.0", note = "Use new_method instead")]
/// fn old_method(&self) -> Result<()> {
///     // Legacy code
/// }
/// ```
#[proc_macro_attribute]
pub fn deprecated(attr: TokenStream, item: TokenStream) -> TokenStream {
    deprecated::expand(attr, item)
}
