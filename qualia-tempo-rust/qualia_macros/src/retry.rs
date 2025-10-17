//! # Responsibility
//! Implements the #[retry] macro for automatic retry logic with exponential backoff.
//!
//! ---
//!
//! This macro wraps async functions with retry logic for transient failures.
//! Supports configurable max attempts, delay, and exponential backoff per
//! QUALIA.CODE.RUST error resilience patterns.

use proc_macro2::TokenStream;
use quote::quote;
use syn::{
    parse2, parse::Parse, parse::ParseStream, ItemFn, LitBool, LitInt, Result, Token,
};

/// # Responsibility
/// Parses #[retry(max_attempts = 3, delay_ms = 100, exponential_backoff = true)] syntax.
struct RetryArgs {
    max_attempts: u32,
    delay_ms: u64,
    exponential_backoff: bool,
}

impl Parse for RetryArgs {
    fn parse(input: ParseStream) -> Result<Self> {
        let mut max_attempts = 3;
        let mut delay_ms = 100;
        let mut exponential_backoff = false;
        
        while !input.is_empty() {
            let ident: syn::Ident = input.parse()?;
            input.parse::<Token![=]>()?;
            
            match ident.to_string().as_str() {
                "max_attempts" => {
                    let lit: LitInt = input.parse()?;
                    max_attempts = lit.base10_parse()?;
                }
                "delay_ms" => {
                    let lit: LitInt = input.parse()?;
                    delay_ms = lit.base10_parse()?;
                }
                "exponential_backoff" => {
                    let lit: LitBool = input.parse()?;
                    exponential_backoff = lit.value;
                }
                _ => {
                    return Err(syn::Error::new_spanned(
                        ident,
                        "Unknown retry parameter"
                    ));
                }
            }
            
            // Parse optional comma
            if !input.is_empty() {
                input.parse::<Token![,]>()?;
            }
        }
        
        Ok(RetryArgs {
            max_attempts,
            delay_ms,
            exponential_backoff,
        })
    }
}

/// # Responsibility
/// Generates retry wrapper with exponential backoff logic.
pub fn impl_retry(attr: TokenStream, item: TokenStream) -> Result<TokenStream> {
    let func: ItemFn = parse2(item)?;
    let args: RetryArgs = parse2(attr)?;
    
    let fn_name = &func.sig.ident;
    let fn_visibility = &func.vis;
    let fn_inputs = &func.sig.inputs;
    let fn_output = &func.sig.output;
    let fn_block = &func.block;
    let fn_generics = &func.sig.generics;
    
    let max_attempts = args.max_attempts;
    let base_delay_ms = args.delay_ms;
    let exponential_backoff = args.exponential_backoff;
    
    // Generate delay calculation
    let delay_calc = if exponential_backoff {
        quote! {
            let delay = base_delay * 2u64.pow(attempt - 1);
        }
    } else {
        quote! {
            let delay = base_delay;
        }
    };
    
    let expanded = quote! {
        #fn_visibility async fn #fn_name #fn_generics(#fn_inputs) #fn_output {
            use tokio::time::{sleep, Duration};
            
            let max_attempts = #max_attempts;
            let base_delay = Duration::from_millis(#base_delay_ms);
            
            let mut attempt = 1;
            
            loop {
                // Execute the function
                let result = (async || #fn_block)().await;
                
                match result {
                    Ok(value) => {
                        return Ok(value);
                    }
                    Err(e) => {
                        if attempt >= max_attempts {
                            tracing::error!(
                                function = stringify!(#fn_name),
                                attempts = attempt,
                                "Retry exhausted, returning error"
                            );
                            return Err(e);
                        }
                        
                        #delay_calc
                        
                        tracing::warn!(
                            function = stringify!(#fn_name),
                            attempt = attempt,
                            max_attempts = max_attempts,
                            delay_ms = delay.as_millis(),
                            error = ?e,
                            "Retrying after failure"
                        );
                        
                        sleep(delay).await;
                        attempt += 1;
                    }
                }
            }
        }
    };
    
    Ok(expanded)
}
