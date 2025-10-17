//! # Responsibility
//! Implements the #[retry(max_attempts, delay_ms)] procedural macro.
//!
//! ---
//!
//! Generates exponential backoff retry logic for async functions. Automatically
//! retries on failure with increasing delays, logging each attempt.

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn, LitInt, Token, parse::Parse, parse::ParseStream};

/// Arguments for retry macro: max_attempts, delay_ms
struct RetryArgs {
    max_attempts: LitInt,
    _comma: Token![,],
    delay_ms: LitInt,
}

impl Parse for RetryArgs {
    fn parse(input: ParseStream) -> syn::Result<Self> {
        Ok(RetryArgs {
            max_attempts: input.parse()?,
            _comma: input.parse()?,
            delay_ms: input.parse()?,
        })
    }
}

/// Implementation of the retry macro
pub fn impl_retry(args: TokenStream, input: TokenStream) -> TokenStream {
    let retry_args = parse_macro_input!(args as RetryArgs);
    let func = parse_macro_input!(input as ItemFn);
    
    let max_attempts = &retry_args.max_attempts;
    let delay_ms = &retry_args.delay_ms;
    
    let func_name = &func.sig.ident;
    let func_vis = &func.vis;
    let func_generics = &func.sig.generics;
    let func_inputs = &func.sig.inputs;
    let func_output = &func.sig.output;
    let func_block = &func.block;
    
    // Extract parameter names for retry calls
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
    
    // Build the expanded code with retry logic
    let expanded = quote! {
        #func_vis async fn #func_name #func_generics(#func_inputs) #func_output {
            // Original function as inner implementation
            async fn inner_impl #func_generics(#func_inputs) #func_output {
                #func_block
            }
            
            let mut attempts = 0u32;
            let max_attempts = #max_attempts;
            let base_delay = std::time::Duration::from_millis(#delay_ms);
            
            loop {
                attempts += 1;
                
                match inner_impl(#(#param_names.clone()),*).await {
                    Ok(result) => {
                        if attempts > 1 {
                            tracing::info!(
                                "Function {} succeeded after {} attempts",
                                stringify!(#func_name),
                                attempts
                            );
                        }
                        return Ok(result);
                    }
                    Err(e) => {
                        if attempts >= max_attempts {
                            tracing::error!(
                                "Function {} failed after {} attempts: {:?}",
                                stringify!(#func_name),
                                max_attempts,
                                e
                            );
                            return Err(e);
                        }
                        
                        // Exponential backoff: delay * 2^(attempts-1)
                        let delay = base_delay * 2u32.pow(attempts - 1);
                        
                        tracing::warn!(
                            "Function {} failed (attempt {}/{}), retrying in {:?}: {:?}",
                            stringify!(#func_name),
                            attempts,
                            max_attempts,
                            delay,
                            e
                        );
                        
                        tokio::time::sleep(delay).await;
                    }
                }
            }
        }
    };
    
    TokenStream::from(expanded)
}
