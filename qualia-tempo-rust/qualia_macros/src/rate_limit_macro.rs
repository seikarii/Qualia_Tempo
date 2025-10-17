//! # Responsibility
//! Implements the #[rate_limit(calls_per_sec)] procedural macro.
//!
//! ---
//!
//! Implements token bucket rate limiting for async functions. Limits the
//! rate at which a function can be called, returning Err when exceeded.

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn, LitInt};

/// Implementation of the rate_limit macro
pub fn impl_rate_limit(args: TokenStream, input: TokenStream) -> TokenStream {
    let calls_per_sec = parse_macro_input!(args as LitInt);
    let func = parse_macro_input!(input as ItemFn);
    
    let func_name = &func.sig.ident;
    let func_vis = &func.vis;
    let func_generics = &func.sig.generics;
    let func_inputs = &func.sig.inputs;
    let func_output = &func.sig.output;
    let func_block = &func.block;
    
    // Generate rate limiter name
    let limiter_name = syn::Ident::new(
        &format!("{}_RATE_LIMITER", func_name.to_string().to_uppercase()),
        func_name.span()
    );
    
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
    
    // Build the expanded code with rate limiting
    let expanded = quote! {
        // Token bucket rate limiter (thread-safe)
        static #limiter_name: once_cell::sync::Lazy<tokio::sync::Mutex<TokenBucket>> = 
            once_cell::sync::Lazy::new(|| {
                tokio::sync::Mutex::new(TokenBucket::new(#calls_per_sec))
            });
        
        #func_vis async fn #func_name #func_generics(#func_inputs) #func_output {
            // Original function as inner implementation
            async fn inner_impl #func_generics(#func_inputs) #func_output {
                #func_block
            }
            
            // Check rate limit
            let mut limiter = #limiter_name.lock().await;
            if !limiter.try_acquire() {
                tracing::warn!(
                    "Rate limit exceeded for function {}",
                    stringify!(#func_name)
                );
                return Err(anyhow::anyhow!(
                    "Rate limit exceeded: max {} calls per second",
                    #calls_per_sec
                ));
            }
            drop(limiter);
            
            // Execute function
            inner_impl(#(#param_names),*).await
        }
        
        /// Simple token bucket implementation
        struct TokenBucket {
            tokens: f64,
            max_tokens: f64,
            refill_rate: f64,
            last_refill: std::time::Instant,
        }
        
        impl TokenBucket {
            fn new(calls_per_sec: u32) -> Self {
                let rate = calls_per_sec as f64;
                Self {
                    tokens: rate,
                    max_tokens: rate,
                    refill_rate: rate,
                    last_refill: std::time::Instant::now(),
                }
            }
            
            fn try_acquire(&mut self) -> bool {
                // Refill tokens based on time elapsed
                let now = std::time::Instant::now();
                let elapsed = now.duration_since(self.last_refill).as_secs_f64();
                self.tokens = (self.tokens + elapsed * self.refill_rate).min(self.max_tokens);
                self.last_refill = now;
                
                // Try to consume a token
                if self.tokens >= 1.0 {
                    self.tokens -= 1.0;
                    true
                } else {
                    false
                }
            }
        }
    };
    
    TokenStream::from(expanded)
}
