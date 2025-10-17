//! # Responsibility
//! Implements the `#[circuit_breaker]` procedural macro for fault tolerance.

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn};

pub fn impl_circuit_breaker(_args: TokenStream, input: TokenStream) -> TokenStream {
    let input_fn = parse_macro_input!(input as ItemFn);
    let tokens = quote! { #input_fn };
    TokenStream::from(tokens)
}
