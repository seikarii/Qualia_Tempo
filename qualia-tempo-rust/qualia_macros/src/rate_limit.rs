//! # Responsibility
//! Implements the #[rate_limit] macro for automatic rate limiting of function calls.
//!
//! ---
//!
//! This macro wraps functions with rate limiting logic using governor crate patterns.
//! Prevents resource exhaustion from excessive function calls per QUALIA.CODE.RUST
//! resource management patterns.

use proc_macro2::TokenStream;
use quote::quote;
use syn::{parse2, parse::Parse, parse::ParseStream, ItemFn, LitInt, Result, Token};

/// # Responsibility
/// Parses #[rate_limit(per_second = 10)] syntax.
struct RateLimitArgs {
    per_second: u32,
}

impl Parse for RateLimitArgs {
    fn parse(input: ParseStream) -> Result<Self> {
        let ident: syn::Ident = input.parse()?;
        if ident != "per_second" {
            return Err(syn::Error::new_spanned(ident, "Expected 'per_second' parameter"));
        }
        
        input.parse::<Token![=]>()?;
        let lit: LitInt = input.parse()?;
        let per_second = lit.base10_parse()?;
        
        Ok(RateLimitArgs { per_second })
    }
}

/// # Responsibility
/// Generates rate limiting wrapper with per-second throttling.
pub fn impl_rate_limit(attr: TokenStream, item: TokenStream) -> Result<TokenStream> {
    let func: ItemFn = parse2(item)?;
    let args: RateLimitArgs = parse2(attr)?;
    
    let fn_name = &func.sig.ident;
    let fn_visibility = &func.vis;
    let fn_inputs = &func.sig.inputs;
    let fn_output = &func.sig.output;
    let fn_block = &func.block;
    let fn_asyncness = &func.sig.asyncness;
    let fn_generics = &func.sig.generics;
    
    let per_second = args.per_second;
    
    let expanded = quote! {
        #fn_visibility #fn_asyncness fn #fn_name #fn_generics(#fn_inputs) #fn_output {
            use std::sync::OnceLock;
            use std::sync::Mutex;
            use std::time::{Duration, Instant};
            use anyhow::bail;
            
            // Rate limiter state
            struct RateLimiter {
                last_call: Option<Instant>,
                min_interval: Duration,
            }
            
            static RATE_LIMITER: OnceLock<Mutex<RateLimiter>> = OnceLock::new();
            
            let limiter = RATE_LIMITER.get_or_init(|| {
                Mutex::new(RateLimiter {
                    last_call: None,
                    min_interval: Duration::from_secs_f64(1.0 / #per_second as f64),
                })
            });
            
            // Check rate limit
            {
                let mut guard = limiter.lock().expect("Rate limiter mutex poisoned");
                let now = Instant::now();
                
                if let Some(last) = guard.last_call {
                    let elapsed = now.duration_since(last);
                    if elapsed < guard.min_interval {
                        let wait_time = guard.min_interval - elapsed;
                        tracing::warn!(
                            function = stringify!(#fn_name),
                            wait_ms = wait_time.as_millis(),
                            "Rate limit exceeded"
                        );
                        bail!("Rate limit exceeded, retry after {}ms", wait_time.as_millis());
                    }
                }
                
                guard.last_call = Some(now);
            }
            
            #fn_block
        }
    };
    
    Ok(expanded)
}
