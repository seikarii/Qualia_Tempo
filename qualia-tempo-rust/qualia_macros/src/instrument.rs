//! # Responsibility
//! Implements the `#[instrument]` macro as a thin wrapper over tracing::instrument.

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn};

pub fn impl_instrument(args: TokenStream, input: TokenStream) -> TokenStream {
    let input_fn = parse_macro_input!(input as ItemFn);
    let args_tokens = proc_macro2::TokenStream::from(args);
    
    let expanded = quote! {
        #[tracing::instrument(#args_tokens)]
        #input_fn
    };
    
    TokenStream::from(expanded)
}
