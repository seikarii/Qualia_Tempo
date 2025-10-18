//! # Responsibility
//! Implements #[cached] procedural macro for function memoization.
//!
//! ---
//!
//! Delegates to the `cached` crate's functionality while providing
//! a clean attribute syntax compatible with Qualia's architecture.

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn};

/// # Responsibility
/// Expands #[cached(ttl = 60)] into memoization wrapper.
pub fn expand(args: TokenStream, input: TokenStream) -> TokenStream {
    let handler_fn = parse_macro_input!(input as ItemFn);
    
    // Parse TTL from args (default 60 seconds)
    let ttl: u64 = if args.is_empty() {
        60
    } else {
        // Simple parsing for ttl = N format
        args.to_string()
            .split('=')
            .nth(1)
            .and_then(|s| s.trim().parse().ok())
            .unwrap_or(60)
    };

    let fn_name = &handler_fn.sig.ident;
    let fn_vis = &handler_fn.vis;
    let fn_generics = &handler_fn.sig.generics;
    let fn_inputs = &handler_fn.sig.inputs;
    let fn_output = &handler_fn.sig.output;
    let fn_block = &handler_fn.block;
    let fn_asyncness = &handler_fn.sig.asyncness;

    let expanded = quote! {
        #[cached::proc_macro::cached(
            time = #ttl,
            sync_writes = true
        )]
        #fn_vis #fn_asyncness fn #fn_name #fn_generics(#fn_inputs) #fn_output {
            #fn_block
        }
    };

    TokenStream::from(expanded)
}
