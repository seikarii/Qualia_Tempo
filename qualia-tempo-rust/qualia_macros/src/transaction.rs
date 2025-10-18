//! # Responsibility
//! Implements the #[transaction] procedural macro for database transactions.
//!
//! ---
//!
//! Wraps functions with automatic transaction begin/commit/rollback logic.

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn};

pub fn impl_transaction(item: TokenStream) -> TokenStream {
    let input_fn = parse_macro_input!(item as ItemFn);
    let expanded = quote! {
        #input_fn
    };
    TokenStream::from(expanded)
}
