#![allow(clippy::doc_markdown)]
//! # Responsibility
//! Implements #[rate_limit] procedural macro for API rate limiting.
//!
//! ---
//!
//! Passthrough implementation for Phase 0. Full rate limiting logic
//! will be implemented in Phase 1 when needed for networking services.

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn};

/// # Responsibility
/// Expands #[rate_limit(per_second = 10)] into rate limiting wrapper.
pub fn expand(_args: TokenStream, input: TokenStream) -> TokenStream {
    let handler_fn = parse_macro_input!(input as ItemFn);
    
    // Phase 0: Passthrough (no rate limiting yet)
    let expanded = quote! {
        #handler_fn
    };

    TokenStream::from(expanded)
}
