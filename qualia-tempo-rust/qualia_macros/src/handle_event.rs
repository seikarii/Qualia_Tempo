//! # Responsibility
//! Implements the #[handle_event] procedural macro for EventBus handler generation.
//!
//! ---
//!
//! This module generates tokio spawn loops that subscribe to EventBus and route
//! specific event types to handler methods, with automatic error handling and
//! lag detection per ARCHITECTURE.RUST v2.0 EventBus pattern.

use proc_macro2::TokenStream;
use quote::quote;
use syn::{parse2, Error, FnArg, ItemFn, Result, Type};

/// # Responsibility
/// Parses the attribute and function, generates the handler spawn function.
pub fn impl_handle_event(attr: TokenStream, item: TokenStream) -> Result<TokenStream> {
    // Parse the event variant from attribute (e.g., GameEvent::QualiaStateUpdated)
    let event_variant: syn::Path = parse2(attr)?;
    
    // Parse the original function
    let original_fn: ItemFn = parse2(item.clone())?;
    let fn_name = &original_fn.sig.ident;
    let fn_visibility = &original_fn.vis;
    
    // Extract the event data type from the second parameter (first is &self)
    let _event_data_type = extract_event_data_type(&original_fn)?;
    
    // Generate handler function name
    let handler_fn_name = syn::Ident::new(
        &format!("{}_handler", fn_name),
        fn_name.span()
    );
    
    // Generate the expanded code
    let expanded = quote! {
        // Keep original function
        #original_fn
        
        // Generate handler spawn function
        #fn_visibility fn #handler_fn_name(
            &self
        ) -> tokio::task::JoinHandle<()> {
            let event_bus = self.event_bus.clone();
            let self_clone = self.clone();
            
            tokio::spawn(async move {
                let mut events = event_bus.subscribe();
                
                loop {
                    match events.recv().await {
                        Ok(#event_variant(data)) => {
                            if let Err(e) = self_clone.#fn_name(data).await {
                                tracing::error!(
                                    handler = stringify!(#fn_name),
                                    error = ?e,
                                    "Error in event handler"
                                );
                            }
                        }
                        Ok(_) => {
                            // Ignore other event types
                        }
                        Err(tokio::sync::broadcast::error::RecvError::Lagged(skipped)) => {
                            tracing::warn!(
                                handler = stringify!(#fn_name),
                                skipped_events = skipped,
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
    
    Ok(expanded)
}

/// # Responsibility
/// Extracts the event data type from the handler function's second parameter.
fn extract_event_data_type(func: &ItemFn) -> Result<&Type> {
    // Get function parameters
    let params: Vec<&FnArg> = func.sig.inputs.iter().collect();
    
    if params.len() < 2 {
        return Err(Error::new_spanned(
            &func.sig,
            "Event handler must have at least 2 parameters: &self and event data"
        ));
    }
    
    // Second parameter should be the event data
    match params[1] {
        FnArg::Typed(pat_type) => Ok(&pat_type.ty),
        _ => Err(Error::new_spanned(
            params[1],
            "Expected typed parameter for event data"
        ))
    }
}
