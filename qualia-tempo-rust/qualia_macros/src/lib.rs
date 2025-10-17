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
