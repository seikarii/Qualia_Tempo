//! # Responsibility
//! Implements the `#[timeout]` procedural macro for async timeout enforcement.

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn, LitInt};

pub fn impl_timeout(args: TokenStream, input: TokenStream) -> TokenStream {
    let mut input_fn = parse_macro_input!(input as ItemFn);
    
    // Parse timeout duration in milliseconds
    let timeout_ms: u64 = if args.is_empty() {
        5000 // Default 5 seconds
    } else {
        let lit: LitInt = parse_macro_input!(args as LitInt);
        lit.base10_parse().unwrap_or(5000)
    };
    
    let original_block = input_fn.block.clone();
    
    // Build timeout logic inside the original function body
    let new_block: syn::Block = syn::parse_quote! {{
        match tokio::time::timeout(
            std::time::Duration::from_millis(#timeout_ms),
            async #original_block
        ).await {
            Ok(result) => result,
            Err(_) => {
                tracing::error!(
                    timeout_ms = #timeout_ms,
                    "Function execution timed out"
                );
                Err(anyhow::anyhow!("Operation timed out after {}ms", #timeout_ms))
            }
        }
    }};
    
    input_fn.block = Box::new(new_block);
    
    let tokens = quote! { #input_fn };
    TokenStream::from(tokens)
}
