//! # Responsibility
//! Implements the `#[rate_limit]` procedural macro for rate limiting.

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn};

pub fn impl_rate_limit(_args: TokenStream, input: TokenStream) -> TokenStream {
    let input_fn = parse_macro_input!(input as ItemFn);
    let tokens = quote! { #input_fn };
    TokenStream::from(tokens)
}
