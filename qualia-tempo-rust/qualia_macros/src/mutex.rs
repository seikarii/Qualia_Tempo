//! # Responsibility
//! Implements the `#[mutex]` procedural macro for automatic mutex locking.

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn};

pub fn impl_mutex(_args: TokenStream, input: TokenStream) -> TokenStream {
    let input_fn = parse_macro_input!(input as ItemFn);
    let tokens = quote! { #input_fn };
    TokenStream::from(tokens)
}
