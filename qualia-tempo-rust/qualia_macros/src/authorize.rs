//! # Responsibility
//! Implements #[authorize] procedural macro.
//!
//! ---
//!
//! Passthrough implementation for Phase 0. Full logic will be
//! implemented in later phases when architectural dependencies are ready.

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn};

/// # Responsibility
/// Expands #[authorize] into wrapped function (Phase 0 passthrough).
pub fn expand(_args: TokenStream, input: TokenStream) -> TokenStream {
    let handler_fn = parse_macro_input!(input as ItemFn);
    
    // Phase 0: Passthrough implementation
    let expanded = quote! {
        #handler_fn
    };

    TokenStream::from(expanded)
}
