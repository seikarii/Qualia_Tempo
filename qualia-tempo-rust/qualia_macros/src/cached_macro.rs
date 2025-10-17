//! # Responsibility
//! Implements the #[cached] procedural macro.
//!
//! ---
//!
//! Generates memoization logic using the `cached` crate. Caches function
//! results based on argument values for performance optimization.

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn};

/// Implementation of the cached macro
pub fn impl_cached(input: TokenStream) -> TokenStream {
    let func = parse_macro_input!(input as ItemFn);
    
    // For now, simply forward to the cached crate's attribute macro
    // This is a simplified implementation that relies on the cached crate
    let expanded = quote! {
        #[cached::proc_macro::cached(size = 100, time = 60, sync_writes = true)]
        #func
    };
    
    TokenStream::from(expanded)
}
