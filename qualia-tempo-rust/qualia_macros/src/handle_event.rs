//! # Responsibility
//! Implementation of the #[handle_event] procedural macro.
//!
//! ---
//!
//! Generates event subscription loops for tokio::sync::broadcast channels.
//! This is the core macro for EventBus pattern implementation.

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn, Path};

/// # Responsibility
/// Expands the #[handle_event] attribute macro into event subscription code.
pub fn expand(args: TokenStream, input: TokenStream) -> TokenStream {
    let event_type = parse_macro_input!(args as Path);
    let input_fn = parse_macro_input!(input as ItemFn);

    let fn_name = &input_fn.sig.ident;
    let fn_block = &input_fn.block;
    let fn_vis = &input_fn.vis;
    let fn_attrs = &input_fn.attrs;

    // Extract parameter name and type (should be the event data)
    let param = match input_fn.sig.inputs.iter().nth(1) {
        Some(syn::FnArg::Typed(pat_type)) => pat_type,
        _ => {
            return syn::Error::new_spanned(
                &input_fn.sig,
                "Handler function must have signature: async fn handler(&self, event_data: EventDataType)"
            )
            .to_compile_error()
            .into();
        }
    };

    let param_name = &param.pat;
    let param_type = &param.ty;

    // Generate handler registration function
    let handler_name = syn::Ident::new(
        &format!("{}_handler", fn_name),
        proc_macro2::Span::call_site(),
    );

    let expanded = quote! {
        #(#fn_attrs)*
        #fn_vis async fn #fn_name(&self, #param_name: #param_type) {
            #fn_block
        }

        /// Generated event handler registration function.
        ///
        /// Spawns a tokio task that subscribes to the EventBus and calls
        /// the handler function for matching events.
        #fn_vis fn #handler_name(&self) -> tokio::task::JoinHandle<()> {
            let event_bus = self.event_bus.clone();
            let service = std::sync::Arc::new(self.clone());

            tokio::spawn(async move {
                let mut rx = event_bus.subscribe();

                loop {
                    match rx.recv().await {
                        Ok(event) => {
                            if let #event_type(data) = event {
                                service.#fn_name(data).await;
                            }
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
