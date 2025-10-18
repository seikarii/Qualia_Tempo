#![allow(clippy::doc_markdown)]
//! # Responsibility
//! Implements #[`handle_event`] procedural macro for event subscription pattern.
//!
//! ---
//!
//! Generates `tokio::spawn` boilerplate that subscribes to `EventBus`,
//! matches event variants, and dispatches to user-defined handler.
//! Replaces `@OnEvent` decorator from TypeScript prototype.

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn, Path};

/// # Responsibility
/// Expands #[`handle_event(EventVariant)`] into full event handler boilerplate.
pub fn expand(args: TokenStream, input: TokenStream) -> TokenStream {
    let event_variant = parse_macro_input!(args as Path);
    let handler_fn = parse_macro_input!(input as ItemFn);

    let fn_name = &handler_fn.sig.ident;
    let handler_name = syn::Ident::new(
        &format!("{fn_name}_handler"),
        fn_name.span(),
    );

    let fn_inputs = &handler_fn.sig.inputs;
    
    // Extract parameter names (skip &self if present)
    let params: Vec<_> = fn_inputs
        .iter()
        .skip(1) // Skip &self
        .filter_map(|arg| {
            if let syn::FnArg::Typed(pat_type) = arg {
                Some(&pat_type.pat)
            } else {
                None
            }
        })
        .collect();

    let param_pattern = if params.len() == 1 {
        let param = &params[0];
        quote! { #param }
    } else {
        quote! { (..) }
    };

    let expanded = quote! {
        // Keep original function for direct calls if needed
        #handler_fn

        /// Generated event handler spawner.
        /// Subscribes to EventBus and dispatches matching events to handler.
        pub fn #handler_name(&self) -> tokio::task::JoinHandle<()> {
            let event_bus = self.event_bus.clone();
            let self_clone = self.clone();

            tokio::spawn(async move {
                let mut rx = event_bus.subscribe();

                loop {
                    match rx.recv().await {
                        Ok(#event_variant(#param_pattern)) => {
                            // Call original handler
                            if let Err(e) = self_clone.#fn_name(#(#params),*).await {
                                tracing::error!(
                                    handler = stringify!(#fn_name),
                                    error = ?e,
                                    "Event handler failed"
                                );
                            }
                        }
                        Ok(_) => {
                            // Ignore other event variants
                        }
                        Err(tokio::sync::broadcast::error::RecvError::Lagged(skipped)) => {
                            tracing::warn!(
                                handler = stringify!(#fn_name),
                                skipped = skipped,
                                "Event handler lagging, skipped events"
                            );
                        }
                        Err(tokio::sync::broadcast::error::RecvError::Closed) => {
                            tracing::info!(
                                handler = stringify!(#fn_name),
                                "EventBus closed, shutting down handler"
                            );
                            break;
                        }
                    }
                }
            })
        }
    };

    TokenStream::from(expanded)
}
