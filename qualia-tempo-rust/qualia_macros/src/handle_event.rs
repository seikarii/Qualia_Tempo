//! # Responsibility
//! Implements the #[handle_event(EventVariant)] procedural macro.
//!
//! ---
//!
//! Generates async event subscription boilerplate for tokio::sync::broadcast
//! based EventBus. This is the highest priority macro as it's used throughout
//! all service implementations for event-driven architecture.

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn, Path};

/// Implementation of the handle_event macro
pub fn impl_handle_event(args: TokenStream, input: TokenStream) -> TokenStream {
    // Parse the event variant path (e.g., GameEvent::QualiaStateUpdated)
    let event_variant = parse_macro_input!(args as Path);
    
    // Parse the function
    let func = parse_macro_input!(input as ItemFn);
    
    // Extract function information
    let func_name = &func.sig.ident;
    let func_vis = &func.vis;
    let func_generics = &func.sig.generics;
    let func_inputs = &func.sig.inputs;
    let func_output = &func.sig.output;
    let func_block = &func.block;
    
    // Generate wrapper function name
    let wrapper_name = syn::Ident::new(
        &format!("{}_event_handler", func_name),
        func_name.span()
    );
    
    // Generate the expanded code
    let expanded = quote! {
        /// Auto-generated event handler wrapper
        /// Spawns tokio task and subscribes to EventBus
        #func_vis fn #wrapper_name #func_generics(
            event_bus: std::sync::Arc<dyn IEventBus>
        ) -> tokio::task::JoinHandle<()> {
            tokio::spawn(async move {
                let mut receiver = event_bus.subscribe();
                
                tracing::info!(
                    "Event handler {} started, listening for {:?}",
                    stringify!(#func_name),
                    stringify!(#event_variant)
                );
                
                loop {
                    match receiver.recv().await {
                        Ok(#event_variant(data)) => {
                            // Call the original function with the extracted data
                            async fn #func_name #func_generics(#func_inputs) #func_output {
                                #func_block
                            }
                            
                            if let Err(e) = #func_name(data).await {
                                tracing::error!(
                                    "Error in event handler {}: {:?}",
                                    stringify!(#func_name),
                                    e
                                );
                            }
                        }
                        Ok(_) => {
                            // Different event variant, ignore
                        }
                        Err(tokio::sync::broadcast::error::RecvError::Lagged(skipped)) => {
                            tracing::warn!(
                                "Event handler {} lagged, skipped {} events",
                                stringify!(#func_name),
                                skipped
                            );
                        }
                        Err(tokio::sync::broadcast::error::RecvError::Closed) => {
                            tracing::info!(
                                "EventBus closed, shutting down handler {}",
                                stringify!(#func_name)
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
