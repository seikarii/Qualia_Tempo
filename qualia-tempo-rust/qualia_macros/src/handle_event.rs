//! # Responsibility
//! Implements the `#[handle_event]` procedural macro for EventBus subscriptions.
//!
//! ---
//!
//! This module generates boilerplate code for subscribing to EventBus events
//! and spawning tokio tasks with proper error handling. Replaces TypeScript's
//! `@OnEvent` decorator from the prototype.

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn, Meta, Path};

/// # Responsibility
/// Implementation of `#[handle_event]` macro expansion.
///
/// ---
///
/// Generates a handler method that:
/// 1. Subscribes to the EventBus
/// 2. Spawns a tokio task
/// 3. Loops over received events
/// 4. Pattern matches on the specified event type
/// 5. Calls the original async function
/// 6. Handles errors gracefully (no panics)
///
/// ## Errors
/// Returns compile error if:
/// - Applied to non-async function
/// - Event type path is malformed
/// - Function doesn't have `&self` receiver
pub fn impl_handle_event(args: TokenStream, input: TokenStream) -> TokenStream {
    let input_fn = parse_macro_input!(input as ItemFn);
    
    // Parse event type from attribute args
    let event_type: Path = match syn::parse(args) {
        Ok(Meta::Path(path)) => path,
        _ => {
            return syn::Error::new_spanned(
                &input_fn.sig.ident,
                "Expected event type path, e.g. #[handle_event(GameEvent::QualiaStateUpdated)]"
            )
            .to_compile_error()
            .into();
        }
    };

    // Validate function is async
    if input_fn.sig.asyncness.is_none() {
        return syn::Error::new_spanned(
            &input_fn.sig.ident,
            "#[handle_event] can only be applied to async functions"
        )
        .to_compile_error()
        .into();
    }

    // Validate function has &self receiver
    let has_self_receiver = input_fn.sig.inputs.iter().any(|arg| {
        matches!(arg, syn::FnArg::Receiver(_))
    });

    if !has_self_receiver {
        return syn::Error::new_spanned(
            &input_fn.sig.ident,
            "#[handle_event] requires &self receiver"
        )
        .to_compile_error()
        .into();
    }

    let fn_name = &input_fn.sig.ident;
    let handler_name = syn::Ident::new(&format!("{}_handler", fn_name), fn_name.span());
    let fn_block = &input_fn.block;
    let fn_inputs = &input_fn.sig.inputs;

    // Extract parameter name (assumes second parameter after &self)
    let event_param = fn_inputs.iter().nth(1).and_then(|arg| {
        if let syn::FnArg::Typed(pat_type) = arg {
            if let syn::Pat::Ident(pat_ident) = &*pat_type.pat {
                return Some(&pat_ident.ident);
            }
        }
        None
    });

    let event_param = match event_param {
        Some(param) => param,
        None => {
            return syn::Error::new_spanned(
                &input_fn.sig.ident,
                "#[handle_event] requires an event parameter (e.g. state: QualiaState)"
            )
            .to_compile_error()
            .into();
        }
    };

    // Generate handler method
    let expanded = quote! {
        /// Generated handler method for EventBus subscription.
        /// Spawns a tokio task that listens for events and dispatches to the handler.
        pub fn #handler_name(&self) -> tokio::task::JoinHandle<()> {
            let event_bus = self.event_bus.clone();
            let self_clone = self.clone(); // Requires service to be Clone
            
            tokio::spawn(async move {
                let mut rx = event_bus.subscribe();
                
                loop {
                    match rx.recv().await {
                        Ok(#event_type(#event_param)) => {
                            // Call original handler
                            if let Err(e) = self_clone.#fn_name(#event_param).await {
                                tracing::error!(
                                    event = stringify!(#event_type),
                                    error = ?e,
                                    "Event handler failed"
                                );
                            }
                        }
                        Ok(_) => {
                            // Ignore other event types
                        }
                        Err(tokio::sync::broadcast::error::RecvError::Lagged(skipped)) => {
                            tracing::warn!(
                                event = stringify!(#event_type),
                                skipped = skipped,
                                "Event handler lagging - skipped events"
                            );
                        }
                        Err(tokio::sync::broadcast::error::RecvError::Closed) => {
                            tracing::info!(
                                event = stringify!(#event_type),
                                "EventBus closed - stopping handler"
                            );
                            break;
                        }
                    }
                }
            })
        }

        // Original async method (kept for direct calls if needed)
        async fn #fn_name #fn_inputs -> Result<(), anyhow::Error> #fn_block
    };

    TokenStream::from(expanded)
}
