//! # Responsibility
//! Implements #[timeout] procedural macro for async operation timeouts.
//!
//! ---
//!
//! Wraps async functions with tokio::time::timeout to prevent hangs.

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn};

/// # Responsibility
/// Expands #[timeout(5000)] into timeout wrapper (milliseconds).
pub fn expand(args: TokenStream, input: TokenStream) -> TokenStream {
    let handler_fn = parse_macro_input!(input as ItemFn);
    
    // Parse timeout from args (default 5000ms)
    let timeout_ms: u64 = if args.is_empty() {
        5000
    } else {
        args.to_string()
            .trim()
            .parse()
            .unwrap_or(5000)
    };

    let fn_name = &handler_fn.sig.ident;
    let fn_vis = &handler_fn.vis;
    let fn_generics = &handler_fn.sig.generics;
    let fn_inputs = &handler_fn.sig.inputs;
    let fn_output = &handler_fn.sig.output;
    let fn_block = &handler_fn.block;

    // Extract parameter patterns (including &self)
    let param_patterns: Vec<_> = fn_inputs
        .iter()
        .filter_map(|arg| match arg {
            syn::FnArg::Receiver(_) => Some(quote! { self }),
            syn::FnArg::Typed(pat_type) => {
                let pat = &pat_type.pat;
                Some(quote! { #pat })
            }
        })
        .collect();

    let inner_fn_name = syn::Ident::new(&format!("{}_inner", fn_name), fn_name.span());

    let expanded = quote! {
        #fn_vis async fn #fn_name #fn_generics(#fn_inputs) #fn_output {
            async fn #inner_fn_name #fn_generics(#fn_inputs) #fn_output {
                #fn_block
            }

            match tokio::time::timeout(
                tokio::time::Duration::from_millis(#timeout_ms),
                #inner_fn_name(#(#param_patterns),*)
            ).await {
                Ok(result) => result,
                Err(_) => {
                    tracing::error!(
                        function = stringify!(#fn_name),
                        timeout_ms = #timeout_ms,
                        "Operation timed out"
                    );
                    Err(anyhow::anyhow!("Operation timed out after {}ms", #timeout_ms))
                }
            }
        }
    };

    TokenStream::from(expanded)
}
