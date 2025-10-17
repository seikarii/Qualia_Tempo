//! # Responsibility
//! Procedural macro crate for QUALIA.CODE.RUST decorators.
//!
//! ---
//!
//! Provides 12 procedural macros replacing Python-style decorators:
//! - handle_event: EventBus subscription boilerplate
//! - validate: Input validation
//! - cached: Result memoization
//! - retry: Exponential backoff retry
//! - timeout: Async timeouts
//! - rate_limit: Token bucket rate limiting
//! - mutex: Mutex lock acquisition
//! - circuit_breaker: Fault tolerance
//! - authorize: Access control
//! - transaction: Database transactions
//! - deprecated: Deprecation warnings
//! - instrument: Tracing integration

use proc_macro::TokenStream;

mod handle_event;
mod validate;
mod cached;
mod retry;
mod timeout;
mod rate_limit;
mod mutex;
mod circuit_breaker;
mod authorize;
mod transaction;
mod deprecated;
mod instrument;

/// # Responsibility
/// Generates EventBus event handler from annotated function.
#[proc_macro_attribute]
pub fn handle_event(args: TokenStream, input: TokenStream) -> TokenStream {
    handle_event::handle_event_impl(args, input)
}

/// # Responsibility
/// Generates validation code for function parameters.
#[proc_macro_attribute]
pub fn validate(args: TokenStream, input: TokenStream) -> TokenStream {
    validate::validate_impl(args, input)
}

/// # Responsibility
/// Generates caching wrapper for function.
#[proc_macro_attribute]
pub fn cached(args: TokenStream, input: TokenStream) -> TokenStream {
    cached::cached_impl(args, input)
}

/// # Responsibility
/// Generates retry wrapper for async function.
#[proc_macro_attribute]
pub fn retry(args: TokenStream, input: TokenStream) -> TokenStream {
    retry::retry_impl(args, input)
}

/// # Responsibility
/// Generates timeout wrapper for async function.
#[proc_macro_attribute]
pub fn timeout(args: TokenStream, input: TokenStream) -> TokenStream {
    timeout::timeout_impl(args, input)
}

/// # Responsibility
/// Generates rate limiting wrapper for function.
#[proc_macro_attribute]
pub fn rate_limit(args: TokenStream, input: TokenStream) -> TokenStream {
    rate_limit::rate_limit_impl(args, input)
}

/// # Responsibility
/// Generates mutex lock acquisition for function.
#[proc_macro_attribute]
pub fn mutex(args: TokenStream, input: TokenStream) -> TokenStream {
    mutex::mutex_impl(args, input)
}

/// # Responsibility
/// Generates circuit breaker wrapper for async function.
#[proc_macro_attribute]
pub fn circuit_breaker(args: TokenStream, input: TokenStream) -> TokenStream {
    circuit_breaker::circuit_breaker_impl(args, input)
}

/// # Responsibility
/// Generates authorization check for function.
#[proc_macro_attribute]
pub fn authorize(args: TokenStream, input: TokenStream) -> TokenStream {
    authorize::authorize_impl(args, input)
}

/// # Responsibility
/// Generates transaction wrapper for database operation.
#[proc_macro_attribute]
pub fn transaction(args: TokenStream, input: TokenStream) -> TokenStream {
    transaction::transaction_impl(args, input)
}

/// # Responsibility
/// Generates deprecation warning for function.
#[proc_macro_attribute]
pub fn deprecated(args: TokenStream, input: TokenStream) -> TokenStream {
    deprecated::deprecated_impl(args, input)
}

/// # Responsibility
/// Generates tracing instrumentation for function.
#[proc_macro_attribute]
pub fn instrument(args: TokenStream, input: TokenStream) -> TokenStream {
    instrument::instrument_impl(args, input)
}
