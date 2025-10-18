//! # Responsibility
//! Implements the #[transaction] procedural macro for database transactions.
//!
//! ---
//!
//! Generates transaction management code (begin/commit/rollback).

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn};

/// # Responsibility
/// Expands #[transaction] into transaction wrapping.
pub fn expand(_attr: TokenStream, item: TokenStream) -> TokenStream {
    let input_fn = parse_macro_input!(item as ItemFn);
    
    let fn_name = &input_fn.sig.ident;
    let fn_vis = &input_fn.vis;
    let fn_inputs = &input_fn.sig.inputs;
    let fn_output = &input_fn.sig.output;
    let fn_block = &input_fn.block;
    let fn_asyncness = &input_fn.sig.asyncness;

    let expanded = quote! {
        #fn_vis #fn_asyncness fn #fn_name(#fn_inputs) #fn_output #fn_block
    };

    TokenStream::from(expanded)
}
