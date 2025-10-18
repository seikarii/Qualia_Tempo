#![allow(clippy::doc_markdown)]
//! # Responsibility
//! Implements `#[retry]` procedural macro for automatic retry with backoff.
//!
//! ---
//!
//! Wraps async functions with retry logic including exponential backoff.
//! Replaces @retry decorator from TypeScript/Python prototype.

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn};

/// # Responsibility
/// Expands `#[retry(max_attempts = 3, delay_ms = 100)]` into retry wrapper.
pub fn expand(_args: TokenStream, input: TokenStream) -> TokenStream {
    let handler_fn = parse_macro_input!(input as ItemFn);
    
    // Parse retry configuration (simplified - hardcoded for MVP)
    let max_attempts = 3u32;
    let base_delay_ms = 100u64;

    let fn_name = &handler_fn.sig.ident;
    let fn_vis = &handler_fn.vis;
    let fn_generics = &handler_fn.sig.generics;
    let fn_inputs = &handler_fn.sig.inputs;
    let fn_output = &handler_fn.sig.output;
    let fn_block = &handler_fn.block;

    // Extract input parameter patterns (including &self)
    let param_patterns: Vec<_> = fn_inputs
        .iter()
        .map(|arg| match arg {
            syn::FnArg::Receiver(_) => quote! { self },
            syn::FnArg::Typed(pat_type) => {
                let pat = &pat_type.pat;
                quote! { #pat }
            }
        })
        .collect();

    let inner_fn_name = syn::Ident::new(&format!("{fn_name}_inner"), fn_name.span());

    let expanded = quote! {
        #fn_vis async fn #fn_name #fn_generics(#fn_inputs) #fn_output {
            async fn #inner_fn_name #fn_generics(#fn_inputs) #fn_output {
                #fn_block
            }

            let mut attempt = 0u32;
            let mut delay = #base_delay_ms;

            loop {
                attempt += 1;

                match #inner_fn_name(#(#param_patterns),*).await {
                    Ok(result) => return Ok(result),
                    Err(e) if attempt >= #max_attempts => {
                        tracing::error!(
                            function = stringify!(#fn_name),
                            attempts = attempt,
                            error = ?e,
                            "Max retry attempts exceeded"
                        );
                        return Err(e);
                    }
                    Err(e) => {
                        tracing::warn!(
                            function = stringify!(#fn_name),
                            attempt = attempt,
                            delay_ms = delay,
                            error = ?e,
                            "Retrying after failure"
                        );
                        tokio::time::sleep(tokio::time::Duration::from_millis(delay)).await;
                        delay *= 2; // Exponential backoff
                    }
                }
            }
        }
    };

    TokenStream::from(expanded)
}
