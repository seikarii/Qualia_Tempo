//! # Responsibility
//! Implements the `#[deprecated]` procedural macro for deprecation warnings.

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn};

pub fn impl_deprecated(args: TokenStream, input: TokenStream) -> TokenStream {
    let input_fn = parse_macro_input!(input as ItemFn);
    let args_tokens = proc_macro2::TokenStream::from(args);
    
    let expanded = quote! {
        #[deprecated(#args_tokens)]
        #input_fn
    };
    
    TokenStream::from(expanded)
}
