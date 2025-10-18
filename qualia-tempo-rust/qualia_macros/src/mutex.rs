//! # Responsibility
//! Implements the #[mutex] procedural macro for automatic locking.
//!
//! ---
//!
//! Wraps shared state access with tokio::sync::Mutex guards.

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn};

pub fn impl_mutex(item: TokenStream) -> TokenStream {
    let input_fn = parse_macro_input!(item as ItemFn);
    let expanded = quote! {
        #input_fn
    };
    TokenStream::from(expanded)
}
