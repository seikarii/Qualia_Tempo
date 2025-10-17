//! # Responsibility
//! Implements the #[circuit_breaker] macro for automatic circuit breaker pattern.
//!
//! ---
//!
//! This macro wraps functions with circuit breaker logic to prevent cascading failures.
//! Tracks failure rate and opens circuit after threshold per QUALIA.CODE.RUST
//! resilience patterns.

use proc_macro2::TokenStream;
use quote::quote;
use syn::{parse2, parse::Parse, parse::ParseStream, ItemFn, LitInt, Result, Token};

/// # Responsibility
/// Parses #[circuit_breaker(failure_threshold = 5)] syntax.
struct CircuitBreakerArgs {
    failure_threshold: u32,
}

impl Parse for CircuitBreakerArgs {
    fn parse(input: ParseStream) -> Result<Self> {
        let ident: syn::Ident = input.parse()?;
        if ident != "failure_threshold" {
            return Err(syn::Error::new_spanned(
                ident,
                "Expected 'failure_threshold' parameter"
            ));
        }
        
        input.parse::<Token![=]>()?;
        let lit: LitInt = input.parse()?;
        let failure_threshold = lit.base10_parse()?;
        
        Ok(CircuitBreakerArgs { failure_threshold })
    }
}

/// # Responsibility
/// Generates circuit breaker wrapper with failure tracking.
pub fn impl_circuit_breaker(attr: TokenStream, item: TokenStream) -> Result<TokenStream> {
    let func: ItemFn = parse2(item)?;
    let args: CircuitBreakerArgs = parse2(attr)?;
    
    let fn_name = &func.sig.ident;
    let fn_visibility = &func.vis;
    let fn_inputs = &func.sig.inputs;
    let fn_output = &func.sig.output;
    let fn_block = &func.block;
    let fn_asyncness = &func.sig.asyncness;
    let fn_generics = &func.sig.generics;
    
    let failure_threshold = args.failure_threshold;
    
    let expanded = quote! {
        #fn_visibility #fn_asyncness fn #fn_name #fn_generics(#fn_inputs) #fn_output {
            use std::sync::OnceLock;
            use std::sync::Mutex;
            use anyhow::bail;
            
            // Circuit breaker state
            #[derive(Debug, Clone, Copy, PartialEq)]
            enum CircuitState {
                Closed,
                Open,
            }
            
            struct CircuitBreaker {
                state: CircuitState,
                failure_count: u32,
                threshold: u32,
            }
            
            static CIRCUIT: OnceLock<Mutex<CircuitBreaker>> = OnceLock::new();
            
            let circuit = CIRCUIT.get_or_init(|| {
                Mutex::new(CircuitBreaker {
                    state: CircuitState::Closed,
                    failure_count: 0,
                    threshold: #failure_threshold,
                })
            });
            
            // Check circuit state
            {
                let guard = circuit.lock().expect("Circuit breaker mutex poisoned");
                if guard.state == CircuitState::Open {
                    tracing::error!(
                        function = stringify!(#fn_name),
                        failures = guard.failure_count,
                        "Circuit breaker is OPEN, rejecting call"
                    );
                    bail!("Circuit breaker open due to repeated failures");
                }
            }
            
            // Execute function
            let result = (async || #fn_block)().await;
            
            // Update circuit state
            {
                let mut guard = circuit.lock().expect("Circuit breaker mutex poisoned");
                
                match &result {
                    Ok(_) => {
                        // Reset on success
                        guard.failure_count = 0;
                        tracing::debug!(
                            function = stringify!(#fn_name),
                            "Circuit breaker: success, reset counter"
                        );
                    }
                    Err(e) => {
                        guard.failure_count += 1;
                        
                        if guard.failure_count >= guard.threshold {
                            guard.state = CircuitState::Open;
                            tracing::error!(
                                function = stringify!(#fn_name),
                                failures = guard.failure_count,
                                error = ?e,
                                "Circuit breaker OPENED"
                            );
                        } else {
                            tracing::warn!(
                                function = stringify!(#fn_name),
                                failures = guard.failure_count,
                                threshold = guard.threshold,
                                error = ?e,
                                "Circuit breaker: failure recorded"
                            );
                        }
                    }
                }
            }
            
            result
        }
    };
    
    Ok(expanded)
}
