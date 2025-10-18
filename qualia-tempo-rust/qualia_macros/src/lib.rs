//! # Responsibility
//! Provides procedural macros for Qualia Tempo architecture enforcement.
//!
//! ---
//!
//! This crate implements critical decorators translated from the TypeScript/Python
//! prototype. All macros enforce QUALIA.CODE.RUST compliance and generate zero-cost
//! abstractions for event handling, caching, retries, and timeouts.

mod handle_event;
mod cached;
mod retry;
mod timeout;
mod rate_limit;
mod instrument;
mod mutex;
mod circuit_breaker;
mod authorize;
mod transaction;
mod deprecated;

use proc_macro::TokenStream;

/// # Responsibility
/// Generates an event handler that subscribes to EventBus and spawns async task.
///
/// ---
///
/// Replaces `@OnEvent` from TypeScript prototype. Automatically generates:
/// - EventBus subscription via `tokio::sync::broadcast::Receiver`
/// - Async task spawning with `tokio::spawn`
/// - Error handling with tracing for handler failures
/// - Graceful shutdown on EventBus drop
///
/// # Example
/// ```rust,ignore
/// #[handle_event(GameEvent::QualiaStateUpdated)]
/// async fn on_qualia_update(&self, state: QualiaState) {
///     // Handler logic
/// }
/// ```
#[proc_macro_attribute]
pub fn handle_event(attr: TokenStream, item: TokenStream) -> TokenStream {
    handle_event::impl_handle_event(attr, item)
}

/// # Responsibility
/// Implements automatic memoization with configurable TTL.
///
/// ---
///
/// Uses `cached` crate as backend. Results are cached based on function arguments.
///
/// # Example
/// ```rust,ignore
/// #[cached(ttl = 60)]
/// async fn expensive_calculation(&self, input: u32) -> Result<u32> {
///     // Heavy computation
/// }
/// ```
#[proc_macro_attribute]
pub fn cached(attr: TokenStream, item: TokenStream) -> TokenStream {
    cached::impl_cached(attr, item)
}

/// # Responsibility
/// Implements automatic retry logic with exponential backoff.
///
/// ---
///
/// Retries failed operations up to `max_attempts` with configurable delays.
///
/// # Example
/// ```rust,ignore
/// #[retry(max_attempts = 3, delay_ms = 100, exponential_backoff = true)]
/// async fn unreliable_network_call(&self) -> Result<Response> {
///     // Network operation
/// }
/// ```
#[proc_macro_attribute]
pub fn retry(attr: TokenStream, item: TokenStream) -> TokenStream {
    retry::impl_retry(attr, item)
}

/// # Responsibility
/// Wraps async functions with timeout enforcement.
///
/// ---
///
/// Returns `Err(TimeoutError)` if function exceeds specified duration.
///
/// # Example
/// ```rust,ignore
/// #[timeout(5000)] // 5 seconds
/// async fn long_operation(&self) -> Result<Output> {
///     // Long running code
/// }
/// ```
#[proc_macro_attribute]
pub fn timeout(attr: TokenStream, item: TokenStream) -> TokenStream {
    timeout::impl_timeout(attr, item)
}

/// # Responsibility
/// Implements rate limiting for function calls.
#[proc_macro_attribute]
pub fn rate_limit(attr: TokenStream, item: TokenStream) -> TokenStream {
    rate_limit::impl_rate_limit(attr, item)
}

/// # Responsibility
/// Wraps function with tracing instrumentation.
#[proc_macro_attribute]
pub fn instrument(attr: TokenStream, item: TokenStream) -> TokenStream {
    instrument::impl_instrument(attr, item)
}

/// # Responsibility
/// Wraps shared state access with tokio::sync::Mutex.
#[proc_macro_attribute]
pub fn mutex(_attr: TokenStream, item: TokenStream) -> TokenStream {
    mutex::impl_mutex(item)
}

/// # Responsibility
/// Implements circuit breaker pattern for fault tolerance.
#[proc_macro_attribute]
pub fn circuit_breaker(attr: TokenStream, item: TokenStream) -> TokenStream {
    circuit_breaker::impl_circuit_breaker(attr, item)
}

/// # Responsibility
/// Enforces authorization checks before function execution.
#[proc_macro_attribute]
pub fn authorize(attr: TokenStream, item: TokenStream) -> TokenStream {
    authorize::impl_authorize(attr, item)
}

/// # Responsibility
/// Wraps function in database transaction.
#[proc_macro_attribute]
pub fn transaction(_attr: TokenStream, item: TokenStream) -> TokenStream {
    transaction::impl_transaction(item)
}

/// # Responsibility
/// Marks function as deprecated with migration guidance.
#[proc_macro_attribute]
pub fn deprecated(attr: TokenStream, item: TokenStream) -> TokenStream {
    deprecated::impl_deprecated(attr, item)
}
