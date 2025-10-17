//! # Responsibility
//! Provides procedural macros for Qualia Tempo architecture enforcement and boilerplate reduction.
//!
//! ---
//!
//! This crate implements all procedural macros used throughout the Qualia Tempo
//! Rust rewrite, including event handlers, caching, retry logic, and instrumentation.

use proc_macro::TokenStream;

mod handle_event;
mod instrument;
mod cached;
mod retry;
mod timeout;
mod validate;
mod rate_limit;
mod mutex;
mod circuit_breaker;
mod authorize;
mod transaction;

/// # Responsibility
/// Generates tokio spawn loop + event subscription for EventBus handler methods.
///
/// ---
///
/// Replaces the `@OnEvent` decorator from the TypeScript prototype. Generates
/// a handler function that spawns a tokio task, subscribes to the EventBus,
/// and automatically handles lag detection and graceful shutdown.
///
/// # Example
/// ```ignore
/// #[handle_event(GameEvent::QualiaStateUpdated)]
/// async fn on_qualia_update(&self, state: QualiaState) -> Result<()> {
///     // Handler logic
///     Ok(())
/// }
/// ```
#[proc_macro_attribute]
pub fn handle_event(attr: TokenStream, item: TokenStream) -> TokenStream {
    handle_event::impl_handle_event(attr.into(), item.into())
        .unwrap_or_else(|e| e.to_compile_error())
        .into()
}

/// # Responsibility
/// Wraps function with tracing instrumentation for observability.
///
/// ---
///
/// Automatically adds `#[tracing::instrument]` with proper configuration.
///
/// # Example
/// ```ignore
/// #[instrument]
/// async fn process_data(&self, input: Data) -> Result<Output> {
///     // Logic
/// }
/// ```
#[proc_macro_attribute]
pub fn instrument(attr: TokenStream, item: TokenStream) -> TokenStream {
    instrument::impl_instrument(attr.into(), item.into())
        .unwrap_or_else(|e| e.to_compile_error())
        .into()
}

/// # Responsibility
/// Provides automatic memoization for computationally expensive functions.
///
/// ---
///
/// Uses `cached` crate as backend for thread-safe caching with TTL support.
///
/// # Example
/// ```ignore
/// #[cached(ttl = 60)]
/// async fn expensive_calculation(&self, input: ComplexInput) -> Result<Output> {
///     // Heavy computation
/// }
/// ```
#[proc_macro_attribute]
pub fn cached(_attr: TokenStream, item: TokenStream) -> TokenStream {
    cached::impl_cached(_attr.into(), item.into())
        .unwrap_or_else(|e| e.to_compile_error())
        .into()
}

/// # Responsibility
/// Adds automatic retry logic with exponential backoff to fallible async functions.
///
/// ---
///
/// # Example
/// ```ignore
/// #[retry(max_attempts = 3, delay_ms = 100, exponential_backoff = true)]
/// async fn unreliable_network_call(&self) -> Result<Response> {
///     // Network call
/// }
/// ```
#[proc_macro_attribute]
pub fn retry(_attr: TokenStream, item: TokenStream) -> TokenStream {
    retry::impl_retry(_attr.into(), item.into())
        .unwrap_or_else(|e| e.to_compile_error())
        .into()
}

/// # Responsibility
/// Wraps async functions with timeout protection to prevent hangs.
///
/// ---
///
/// # Example
/// ```ignore
/// #[timeout(5000)] // 5 seconds
/// async fn long_running_operation(&self) -> Result<Output> {
///     // Operation
/// }
/// ```
#[proc_macro_attribute]
pub fn timeout(_attr: TokenStream, item: TokenStream) -> TokenStream {
    timeout::impl_timeout(_attr.into(), item.into())
        .unwrap_or_else(|e| e.to_compile_error())
        .into()
}

/// # Responsibility
/// Wraps functions with input validation logic.
///
/// ---
///
/// # Example
/// ```ignore
/// #[validate]
/// async fn process_input(&self, data: ValidatedData) -> Result<Output> {
///     // Logic
/// }
/// ```
#[proc_macro_attribute]
pub fn validate(_attr: TokenStream, item: TokenStream) -> TokenStream {
    validate::impl_validate(_attr.into(), item.into())
        .unwrap_or_else(|e| e.to_compile_error())
        .into()
}

/// # Responsibility
/// Adds rate limiting to functions to prevent resource exhaustion.
///
/// ---
///
/// # Example
/// ```ignore
/// #[rate_limit(per_second = 10)]
/// async fn api_call(&self) -> Result<Response> {
///     // API logic
/// }
/// ```
#[proc_macro_attribute]
pub fn rate_limit(_attr: TokenStream, item: TokenStream) -> TokenStream {
    rate_limit::impl_rate_limit(_attr.into(), item.into())
        .unwrap_or_else(|e| e.to_compile_error())
        .into()
}

/// # Responsibility
/// Wraps function with tokio::sync::Mutex for exclusive access.
///
/// ---
///
/// # Example
/// ```ignore
/// #[mutex]
/// async fn critical_section(&self) -> Result<()> {
///     // Protected logic
/// }
/// ```
#[proc_macro_attribute]
pub fn mutex(_attr: TokenStream, item: TokenStream) -> TokenStream {
    mutex::impl_mutex(_attr.into(), item.into())
        .unwrap_or_else(|e| e.to_compile_error())
        .into()
}

/// # Responsibility
/// Implements circuit breaker pattern for failure resilience.
///
/// ---
///
/// # Example
/// ```ignore
/// #[circuit_breaker(failure_threshold = 5)]
/// async fn unreliable_service(&self) -> Result<Data> {
///     // Service call
/// }
/// ```
#[proc_macro_attribute]
pub fn circuit_breaker(_attr: TokenStream, item: TokenStream) -> TokenStream {
    circuit_breaker::impl_circuit_breaker(_attr.into(), item.into())
        .unwrap_or_else(|e| e.to_compile_error())
        .into()
}

/// # Responsibility
/// Adds role-based authorization checks to functions.
///
/// ---
///
/// # Example
/// ```ignore
/// #[authorize(role = "admin")]
/// async fn admin_only_action(&self) -> Result<()> {
///     // Admin logic
/// }
/// ```
#[proc_macro_attribute]
pub fn authorize(_attr: TokenStream, item: TokenStream) -> TokenStream {
    authorize::impl_authorize(_attr.into(), item.into())
        .unwrap_or_else(|e| e.to_compile_error())
        .into()
}

/// # Responsibility
/// Wraps function in database transaction with automatic commit/rollback.
///
/// ---
///
/// # Example
/// ```ignore
/// #[transaction]
/// async fn update_user(&self, user: User) -> Result<()> {
///     // Database operations
/// }
/// ```
#[proc_macro_attribute]
pub fn transaction(_attr: TokenStream, item: TokenStream) -> TokenStream {
    transaction::impl_transaction(_attr.into(), item.into())
        .unwrap_or_else(|e| e.to_compile_error())
        .into()
}
