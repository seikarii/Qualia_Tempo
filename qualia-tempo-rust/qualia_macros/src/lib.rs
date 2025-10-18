//! # Responsibility
//! Provides procedural macros for Qualia Tempo architectural patterns.
//!
//! ---
//!
//! This crate implements all decorator-style macros needed to translate
//! TypeScript/Python decorators (`@OnEvent`, `@retry`, etc.) to Rust.
//! Compliance: QUALIA.CODE.RUST v1.1 §5 + BLUEPRINT.RUST.md §4.3

use proc_macro::TokenStream;

mod handle_event;
mod cached;
mod retry;
mod timeout;
mod rate_limit;
mod circuit_breaker;
mod instrument;
mod validate;
mod authorize;
mod transaction;
mod deprecated;

/// # Responsibility
/// Generates event handler boilerplate for `tokio::spawn` + error handling.
///
/// ---
///
/// Replaces `@OnEvent` decorator from TypeScript prototype.
/// Generates async task that subscribes to `EventBus` and dispatches to handler.
///
/// # Example
/// ```ignore
/// #[handle_event(GameEvent::QualiaStateUpdated)]
/// async fn on_qualia_update(&self, state: QualiaState) {
///     // Handler logic
/// }
/// ```
#[proc_macro_attribute]
pub fn handle_event(args: TokenStream, input: TokenStream) -> TokenStream {
    crate::handle_event::expand(args, input)
}

/// # Responsibility
/// Implements memoization for expensive function calls with configurable TTL.
///
/// ---
///
/// Wraps function with `cached` crate's memoization logic.
///
/// # Example
/// ```ignore
/// #[cached(ttl = 60)]
/// async fn expensive_calculation(&self, input: u32) -> Result<u64> {
///     // Heavy computation
/// }
/// ```
#[proc_macro_attribute]
pub fn cached(args: TokenStream, input: TokenStream) -> TokenStream {
    crate::cached::expand(args, input)
}

/// # Responsibility
/// Implements automatic retry logic with exponential backoff.
///
/// ---
///
/// Replaces `@retry` decorator from prototype.
///
/// # Example
/// ```ignore
/// #[retry(max_attempts = 3, delay_ms = 100, exponential_backoff = true)]
/// async fn unreliable_operation(&self) -> Result<Response> {
///     // Potentially failing operation
/// }
/// ```
#[proc_macro_attribute]
pub fn retry(args: TokenStream, input: TokenStream) -> TokenStream {
    crate::retry::expand(args, input)
}

/// # Responsibility
/// Implements timeout enforcement for long-running operations.
///
/// ---
///
/// Wraps function with `tokio::time::timeout`.
///
/// # Example
/// ```ignore
/// #[timeout(5000)] // 5 seconds
/// async fn long_operation(&self) -> Result<Output> {
///     // Long-running task
/// }
/// ```
#[proc_macro_attribute]
pub fn timeout(args: TokenStream, input: TokenStream) -> TokenStream {
    crate::timeout::expand(args, input)
}

/// # Responsibility
/// Implements rate limiting for API endpoints or resource access.
///
/// ---
///
/// Uses leaky bucket algorithm for rate control.
///
/// # Example
/// ```ignore
/// #[rate_limit(per_second = 10)]
/// async fn api_endpoint(&self, req: Request) -> Result<Response> {
///     // Rate-limited operation
/// }
/// ```
#[proc_macro_attribute]
pub fn rate_limit(args: TokenStream, input: TokenStream) -> TokenStream {
    crate::rate_limit::expand(args, input)
}

/// # Responsibility
/// Implements circuit breaker pattern for fault tolerance.
///
/// ---
///
/// Prevents cascade failures by stopping calls to failing services.
///
/// # Example
/// ```ignore
/// #[circuit_breaker(failure_threshold = 5, reset_timeout_ms = 10000)]
/// async fn external_service_call(&self) -> Result<Response> {
///     // External dependency
/// }
/// ```
#[proc_macro_attribute]
pub fn circuit_breaker(args: TokenStream, input: TokenStream) -> TokenStream {
    crate::circuit_breaker::expand(args, input)
}

/// # Responsibility
/// Wrapper for `tracing::instrument` macro with Qualia-specific defaults.
///
/// ---
///
/// Replaces `@logMethod` decorator from prototype.
///
/// # Example
/// ```ignore
/// #[instrument]
/// async fn business_logic(&self, input: Data) -> Result<Output> {
///     // Auto-traced function
/// }
/// ```
#[proc_macro_attribute]
pub fn instrument(args: TokenStream, input: TokenStream) -> TokenStream {
    crate::instrument::expand(args, input)
}

/// # Responsibility
/// Implements runtime validation using validator crate.
///
/// ---
///
/// Validates function inputs/outputs against schema.
///
/// # Example
/// ```ignore
/// #[validate]
/// fn process_input(&self, #[validate(range(min = 0.0, max = 1.0))] intensity: f32) {
///     // Validated input
/// }
/// ```
#[proc_macro_attribute]
pub fn validate(args: TokenStream, input: TokenStream) -> TokenStream {
    crate::validate::expand(args, input)
}

/// # Responsibility
/// Implements authorization checks for method access.
///
/// ---
///
/// Enforces role-based access control.
///
/// # Example
/// ```ignore
/// #[authorize(role = "admin")]
/// async fn admin_only_operation(&self) -> Result<()> {
///     // Restricted operation
/// }
/// ```
#[proc_macro_attribute]
pub fn authorize(args: TokenStream, input: TokenStream) -> TokenStream {
    crate::authorize::expand(args, input)
}

/// # Responsibility
/// Wraps database operations in transactions.
///
/// ---
///
/// Auto-commits on success, rolls back on error.
///
/// # Example
/// ```ignore
/// #[transaction]
/// async fn atomic_db_operation(&self, data: Data) -> Result<()> {
///     // Transaction scope
/// }
/// ```
#[proc_macro_attribute]
pub fn transaction(args: TokenStream, input: TokenStream) -> TokenStream {
    crate::transaction::expand(args, input)
}

/// # Responsibility
/// Marks deprecated functions with compile-time warnings.
///
/// ---
///
/// Provides migration guidance for API changes.
///
/// # Example
/// ```ignore
/// #[deprecated(since = "1.0", note = "Use new_method instead")]
/// fn old_method(&self) {
///     // Legacy code
/// }
/// ```
#[proc_macro_attribute]
pub fn deprecated(args: TokenStream, input: TokenStream) -> TokenStream {
    crate::deprecated::expand(args, input)
}
