//! # Responsibility
//! Provides procedural macros for Qualia Tempo architectural patterns.
//!
//! ---
//!
//! This crate implements all procedural macros used across the project,
//! replacing TypeScript decorators and Python decorators with compile-time
//! code generation. All macros enforce QUALIA.CODE.RUST architectural mandates.

use proc_macro::TokenStream;

mod handle_event;
mod cached;
mod retry;

/// # Responsibility
/// Generates event handler boilerplate for tokio::sync::broadcast subscription.
///
/// ---
///
/// Replaces TypeScript `@OnEvent` decorator. Automatically generates:
/// - Event subscription loop
/// - Pattern matching for specific event types
/// - Error handling without panics
/// - Graceful shutdown on EventBus drop
///
/// # Example
///
/// ```ignore
/// #[handle_event(GameEvent::QualiaStateUpdated)]
/// async fn on_qualia_update(&self, state: QualiaState) {
///     // Handler logic
/// }
/// ```
///
/// Expands to a method that spawns a tokio task subscribing to the EventBus.
#[proc_macro_attribute]
pub fn handle_event(args: TokenStream, input: TokenStream) -> TokenStream {
    handle_event::expand(args, input)
}

/// # Responsibility
/// Provides automatic memoization for computationally expensive functions.
///
/// ---
///
/// Caches function results based on input parameters. Supports TTL-based
/// expiration for time-sensitive computations. Uses the `cached` crate
/// as backend for thread-safe caching.
///
/// # Example
///
/// ```ignore
/// #[cached(ttl = 60)]
/// async fn expensive_calculation(&self, input: u32) -> Result<u32> {
///     // Heavy computation
///     Ok(input * 2)
/// }
/// ```
///
/// The function will only execute once per unique input within the TTL window.
#[proc_macro_attribute]
pub fn cached(args: TokenStream, input: TokenStream) -> TokenStream {
    cached::expand(args, input)
}

/// # Responsibility
/// Provides automatic retry logic with exponential backoff for resilient operations.
///
/// ---
///
/// Wraps async functions with retry logic for handling transient failures
/// (network errors, service unavailability). Supports configurable retry
/// attempts, delays, and exponential backoff strategy.
///
/// # Example
///
/// ```ignore
/// #[retry(max_attempts = 3, delay_ms = 100, exponential_backoff = true)]
/// async fn unreliable_network_call(&self) -> Result<Response> {
///     // Network operation that may fail
/// }
/// ```
///
/// Logs warnings on each retry attempt and errors when max attempts exceeded.
#[proc_macro_attribute]
pub fn retry(args: TokenStream, input: TokenStream) -> TokenStream {
    retry::expand(args, input)
}
