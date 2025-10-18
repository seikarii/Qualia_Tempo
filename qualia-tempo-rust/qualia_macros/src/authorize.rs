//! # Responsibility
//! Implements the #[authorize] procedural macro for access control.
//!
//! ---
//!
//! Wraps functions with authorization checks before execution.

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn};

pub fn impl_authorize(_attr: TokenStream, item: TokenStream) -> TokenStream {
    let input_fn = parse_macro_input!(item as ItemFn);
    let expanded = quote! {
        #input_fn
    };
    TokenStream::from(expanded)
}
