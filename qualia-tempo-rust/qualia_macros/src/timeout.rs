//! # Responsibility
//! Implements the #[timeout] macro for async function timeout protection.
//!
//! ---
//!
//! This macro wraps async functions with tokio::time::timeout to prevent hangs.
//! Returns TimeoutError if operation exceeds specified duration per
//! QUALIA.CODE.RUST resilience patterns.

use proc_macro2::TokenStream;
use quote::quote;
use syn::{parse2, ItemFn, LitInt, Result};

/// # Responsibility
/// Generates timeout wrapper using tokio::time::timeout.
pub fn impl_timeout(attr: TokenStream, item: TokenStream) -> Result<TokenStream> {
    let func: ItemFn = parse2(item)?;
    
    // Parse timeout duration in milliseconds
    let timeout_ms: LitInt = parse2(attr)?;
    let timeout_value: u64 = timeout_ms.base10_parse()?;
    
    let fn_name = &func.sig.ident;
    let fn_visibility = &func.vis;
    let fn_inputs = &func.sig.inputs;
    let fn_output = &func.sig.output;
    let fn_block = &func.block;
    let fn_generics = &func.sig.generics;
    
    let expanded = quote! {
        #fn_visibility async fn #fn_name #fn_generics(#fn_inputs) #fn_output {
            use tokio::time::{timeout, Duration};
            use anyhow::{Context, bail};
            
            let timeout_duration = Duration::from_millis(#timeout_value);
            
            // Execute with timeout
            let result = timeout(timeout_duration, async || #fn_block).await;
            
            match result {
                Ok(inner_result) => inner_result,
                Err(_elapsed) => {
                    tracing::error!(
                        function = stringify!(#fn_name),
                        timeout_ms = #timeout_value,
                        "Function execution timed out"
                    );
                    bail!("Operation timed out after {}ms", #timeout_value)
                }
            }
        }
    };
    
    Ok(expanded)
}
