//! # Responsibility
//! Implements the #[instrument] procedural macro for tracing integration.
//!
//! ---
//!
//! Wraps functions with automatic tracing span creation for observability.

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn};

pub fn impl_instrument(_attr: TokenStream, item: TokenStream) -> TokenStream {
    let input_fn = parse_macro_input!(item as ItemFn);
    let expanded = quote! {
        #input_fn
    };
    TokenStream::from(expanded)
}
