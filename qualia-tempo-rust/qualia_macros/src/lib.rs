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
