//! # Responsibility
//! Implements the `#[retry]` procedural macro for automatic retry logic.

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn, parse::Parse, parse::ParseStream, Token, LitInt, Ident, LitBool};

/// Parse arguments for #[retry(max_attempts = 3, delay_ms = 100, exponential_backoff = true)]
struct RetryArgs {
    max_attempts: u32,
    delay_ms: u64,
    exponential_backoff: bool,
}

impl Parse for RetryArgs {
    fn parse(input: ParseStream) -> syn::Result<Self> {
        let mut max_attempts = 3u32;
        let mut delay_ms = 100u64;
        let mut exponential_backoff = false;
        
        while !input.is_empty() {
            let key: Ident = input.parse()?;
            input.parse::<Token![=]>()?;
            
            if key == "max_attempts" {
                let value: LitInt = input.parse()?;
                max_attempts = value.base10_parse()?;
            } else if key == "delay_ms" {
                let value: LitInt = input.parse()?;
                delay_ms = value.base10_parse()?;
            } else if key == "exponential_backoff" {
                let value: LitBool = input.parse()?;
                exponential_backoff = value.value;
            }
            
            if !input.is_empty() {
                input.parse::<Token![,]>()?;
            }
        }
        
        Ok(RetryArgs { max_attempts, delay_ms, exponential_backoff })
    }
}

pub fn impl_retry(args: TokenStream, input: TokenStream) -> TokenStream {
    let mut input_fn = parse_macro_input!(input as ItemFn);
    
    let retry_args = if args.is_empty() {
        RetryArgs { max_attempts: 3, delay_ms: 100, exponential_backoff: false }
    } else {
        parse_macro_input!(args as RetryArgs)
    };
    
    let max_attempts = retry_args.max_attempts;
    let delay_ms = retry_args.delay_ms;
    let exponential = retry_args.exponential_backoff;
    
    let original_block = input_fn.block.clone();
    
    // Build retry logic inside the original function body
    let new_block = if exponential {
        syn::parse_quote! {{
            for attempt in 1..=#max_attempts {
                let result: Result<_, _> = async #original_block.await;
                match result {
                    Ok(value) => return Ok(value),
                    Err(e) => {
                        if attempt == #max_attempts {
                            return Err(e);
                        }
                        let backoff_delay = #delay_ms * 2u64.pow(attempt - 1);
                        tracing::warn!(
                            attempt = attempt,
                            max_attempts = #max_attempts,
                            delay_ms = backoff_delay,
                            error = ?e,
                            "Retry attempt failed, backing off exponentially"
                        );
                        tokio::time::sleep(std::time::Duration::from_millis(backoff_delay)).await;
                    }
                }
            }
            unreachable!()
        }}
    } else {
        syn::parse_quote! {{
            for attempt in 1..=#max_attempts {
                let result: Result<_, _> = async #original_block.await;
                match result {
                    Ok(value) => return Ok(value),
                    Err(e) => {
                        if attempt == #max_attempts {
                            return Err(e);
                        }
                        tracing::warn!(
                            attempt = attempt,
                            max_attempts = #max_attempts,
                            delay_ms = #delay_ms,
                            error = ?e,
                            "Retry attempt failed"
                        );
                        tokio::time::sleep(std::time::Duration::from_millis(#delay_ms)).await;
                    }
                }
            }
            unreachable!()
        }}
    };
    
    input_fn.block = Box::new(new_block);
    
    let tokens = quote! { #input_fn };
    TokenStream::from(tokens)
}
