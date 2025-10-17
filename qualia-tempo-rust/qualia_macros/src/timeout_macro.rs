//! # Responsibility
//! Implements the #[with_timeout(ms)] procedural macro.
//!
//! ---
//!
//! Wraps async functions with tokio::time::timeout. Returns Err if the
//! function exceeds the specified timeout duration.

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn, LitInt};

/// Implementation of the with_timeout macro
pub fn impl_with_timeout(args: TokenStream, input: TokenStream) -> TokenStream {
    let timeout_ms = parse_macro_input!(args as LitInt);
    let func = parse_macro_input!(input as ItemFn);
    
    let func_name = &func.sig.ident;
    let func_vis = &func.vis;
    let func_generics = &func.sig.generics;
    let func_inputs = &func.sig.inputs;
    let func_output = &func.sig.output;
    let func_block = &func.block;
    
    // Extract parameter names
    let param_names: Vec<_> = func_inputs
        .iter()
        .filter_map(|arg| {
            if let syn::FnArg::Typed(pat_type) = arg {
                if let syn::Pat::Ident(pat_ident) = &*pat_type.pat {
                    Some(&pat_ident.ident)
                } else {
                    None
                }
            } else {
                None
            }
        })
        .collect();
    
    // Build the expanded code with timeout wrapper
    let expanded = quote! {
        #func_vis async fn #func_name #func_generics(#func_inputs) #func_output {
            // Original function as inner implementation
            async fn inner_impl #func_generics(#func_inputs) #func_output {
                #func_block
            }
            
            let timeout_duration = std::time::Duration::from_millis(#timeout_ms);
            
            match tokio::time::timeout(timeout_duration, inner_impl(#(#param_names),*)).await {
                Ok(result) => result,
                Err(_) => {
                    tracing::error!(
                        "Function {} timed out after {:?}",
                        stringify!(#func_name),
                        timeout_duration
                    );
                    Err(anyhow::anyhow!(
                        "Operation timed out after {:?}",
                        timeout_duration
                    ))
                }
            }
        }
    };
    
    TokenStream::from(expanded)
}
