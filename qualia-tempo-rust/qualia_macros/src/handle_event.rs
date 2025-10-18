//! # Responsibility
//! Implements the #[handle_event] procedural macro.
//!
//! ---
//!
//! Generates tokio::spawn-based event handlers with automatic:
//! - Event loop with pattern matching
//! - Error handling (no panics on handler errors)
//! - Lag detection and logging
//! - Graceful shutdown on EventBus drop

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, punctuated::Punctuated, ItemFn, Meta, Token};

/// # Responsibility
/// Expands #[handle_event(EventType)] into full handler method.
pub fn expand(attr: TokenStream, item: TokenStream) -> TokenStream {
    let args = parse_macro_input!(attr with Punctuated::<Meta, Token![,]>::parse_terminated);
    let input_fn = parse_macro_input!(item as ItemFn);

    // Extract event type from attribute
    let event_type = match args.first() {
        Some(Meta::Path(path)) => path,
        _ => {
            return syn::Error::new(
                proc_macro2::Span::call_site(),
                "Expected event type as argument: #[handle_event(GameEvent::QualiaStateUpdated)]",
            )
            .to_compile_error()
            .into();
        }
    };

    let fn_name = &input_fn.sig.ident;
    let fn_vis = &input_fn.vis;
    let handler_name = syn::Ident::new(&format!("{}_handler", fn_name), fn_name.span());
    let fn_block = &input_fn.block;
    let fn_inputs = &input_fn.sig.inputs;
    let fn_output = &input_fn.sig.output;

    // Validate handler signature (must have &self + data parameter)
    if fn_inputs.len() < 2 {
        return syn::Error::new_spanned(
            fn_inputs,
            "Handler must have signature: fn(&self, data: EventData) -> Result<()>",
        )
        .to_compile_error()
        .into();
    }

    let expanded = quote! {
        /// # Responsibility
        /// Original handler logic (kept for direct calls if needed).
        #fn_vis async fn #fn_name(#fn_inputs) #fn_output #fn_block

        /// # Responsibility
        /// Generated event subscription handler.
        ///
        /// ---
        ///
        /// Spawns a tokio task that subscribes to EventBus and routes matching
        /// events to the original handler function. Handles errors gracefully.
        ///
        /// **CRITICAL**: Assumes `self` is `Arc<Self>` from Shaku DI container.
        #fn_vis fn #handler_name(self: std::sync::Arc<Self>) -> tokio::task::JoinHandle<()> {
            let event_bus = self.event_bus.clone();
            let self_clone = self.clone();
            
            tokio::spawn(async move {
                let mut events = event_bus.subscribe();
                
                loop {
                    match events.recv().await {
                        Ok(#event_type(data)) => {
                            if let Err(e) = self_clone.#fn_name(data).await {
                                tracing::error!(
                                    handler = stringify!(#fn_name),
                                    error = ?e,
                                    "Handler execution failed"
                                );
                            }
                        }
                        Ok(_) => {
                            // Ignore other event types
                        }
                        Err(tokio::sync::broadcast::error::RecvError::Lagged(skipped)) => {
                            tracing::warn!(
                                handler = stringify!(#fn_name),
                                skipped = skipped,
                                "Handler lagged behind EventBus"
                            );
                        }
                        Err(tokio::sync::broadcast::error::RecvError::Closed) => {
                            tracing::info!(
                                handler = stringify!(#fn_name),
                                "EventBus closed, stopping handler"
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
