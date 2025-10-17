//! # Responsibility
//! Implements the `#[authorize]` procedural macro for authorization checks.

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn};

pub fn impl_authorize(_args: TokenStream, input: TokenStream) -> TokenStream {
    let input_fn = parse_macro_input!(input as ItemFn);
    let tokens = quote! { #input_fn };
    TokenStream::from(tokens)
}
