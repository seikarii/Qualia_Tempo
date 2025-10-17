//! # Responsibility
//! Implements the #[mutex] macro for automatic mutex wrapping of function calls.
//!
//! ---
//!
//! This macro wraps functions with tokio::sync::Mutex to ensure exclusive access.
//! Used for protecting critical sections per QUALIA.CODE.RUST concurrency patterns.

use proc_macro2::TokenStream;
use quote::quote;
use syn::{parse2, ItemFn, Result};

/// # Responsibility
/// Generates mutex-protected function wrapper using tokio::sync::Mutex.
pub fn impl_mutex(_attr: TokenStream, item: TokenStream) -> Result<TokenStream> {
    let func: ItemFn = parse2(item)?;
    
    let fn_name = &func.sig.ident;
    let fn_visibility = &func.vis;
    let fn_inputs = &func.sig.inputs;
    let fn_output = &func.sig.output;
    let fn_block = &func.block;
    let fn_generics = &func.sig.generics;
    
    let expanded = quote! {
        #fn_visibility async fn #fn_name #fn_generics(#fn_inputs) #fn_output {
            use std::sync::OnceLock;
            use tokio::sync::Mutex;
            
            // Global mutex for this function
            static FUNCTION_MUTEX: OnceLock<Mutex<()>> = OnceLock::new();
            
            let mutex = FUNCTION_MUTEX.get_or_init(|| Mutex::new(()));
            
            // Acquire lock
            let _guard = mutex.lock().await;
            
            tracing::trace!(
                function = stringify!(#fn_name),
                "Acquired mutex lock"
            );
            
            #fn_block
        }
    };
    
    Ok(expanded)
}
