//! # Responsibility
//! Implements the #[circuit_breaker] procedural macro.
//!
//! ---
//!
//! Implements the circuit breaker pattern to prevent cascading failures.
//! Opens circuit after threshold failures, automatically tries to close
//! after recovery period.

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn};

/// Implementation of the circuit_breaker macro
pub fn impl_circuit_breaker(input: TokenStream) -> TokenStream {
    let func = parse_macro_input!(input as ItemFn);
    
    let func_name = &func.sig.ident;
    let func_vis = &func.vis;
    let func_generics = &func.sig.generics;
    let func_inputs = &func.sig.inputs;
    let func_output = &func.sig.output;
    let func_block = &func.block;
    
    // Generate circuit breaker name
    let cb_name = syn::Ident::new(
        &format!("{}_CIRCUIT_BREAKER", func_name.to_string().to_uppercase()),
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
    
    // Build the expanded code with circuit breaker
    let expanded = quote! {
        // Circuit breaker state (thread-safe)
        static #cb_name: once_cell::sync::Lazy<tokio::sync::Mutex<CircuitBreaker>> = 
            once_cell::sync::Lazy::new(|| {
                tokio::sync::Mutex::new(CircuitBreaker::new(5, 60))
            });
        
        #func_vis async fn #func_name #func_generics(#func_inputs) #func_output {
            // Original function as inner implementation
            async fn inner_impl #func_generics(#func_inputs) #func_output {
                #func_block
            }
            
            // Check circuit breaker state
            let mut cb = #cb_name.lock().await;
            
            match cb.state() {
                CircuitState::Open => {
                    tracing::warn!(
                        "Circuit breaker open for function {}",
                        stringify!(#func_name)
                    );
                    drop(cb);
                    return Err(anyhow::anyhow!("Circuit breaker is open"));
                }
                CircuitState::HalfOpen => {
                    tracing::info!(
                        "Circuit breaker half-open for function {}, attempting call",
                        stringify!(#func_name)
                    );
                }
                CircuitState::Closed => {}
            }
            
            drop(cb);
            
            // Execute function and record result
            match inner_impl(#(#param_names),*).await {
                Ok(result) => {
                    let mut cb = #cb_name.lock().await;
                    cb.record_success();
                    Ok(result)
                }
                Err(e) => {
                    let mut cb = #cb_name.lock().await;
                    cb.record_failure();
                    Err(e)
                }
            }
        }
        
        /// Circuit breaker states
        #[derive(Debug, Clone, Copy, PartialEq, Eq)]
        enum CircuitState {
            Closed,    // Normal operation
            Open,      // Failing, reject requests
            HalfOpen,  // Testing recovery
        }
        
        /// Circuit breaker implementation
        struct CircuitBreaker {
            state: CircuitState,
            failure_count: u32,
            failure_threshold: u32,
            last_failure_time: Option<std::time::Instant>,
            timeout_seconds: u64,
        }
        
        impl CircuitBreaker {
            fn new(failure_threshold: u32, timeout_seconds: u64) -> Self {
                Self {
                    state: CircuitState::Closed,
                    failure_count: 0,
                    failure_threshold,
                    last_failure_time: None,
                    timeout_seconds,
                }
            }
            
            fn state(&mut self) -> CircuitState {
                // Check if we should transition from Open to HalfOpen
                if self.state == CircuitState::Open {
                    if let Some(last_failure) = self.last_failure_time {
                        let elapsed = std::time::Instant::now()
                            .duration_since(last_failure)
                            .as_secs();
                        
                        if elapsed >= self.timeout_seconds {
                            tracing::info!("Circuit breaker transitioning to HalfOpen");
                            self.state = CircuitState::HalfOpen;
                            self.failure_count = 0;
                        }
                    }
                }
                
                self.state
            }
            
            fn record_success(&mut self) {
                match self.state {
                    CircuitState::HalfOpen => {
                        tracing::info!("Circuit breaker closing after successful call");
                        self.state = CircuitState::Closed;
                        self.failure_count = 0;
                        self.last_failure_time = None;
                    }
                    CircuitState::Closed => {
                        // Reset failure count on success
                        self.failure_count = 0;
                    }
                    CircuitState::Open => {}
                }
            }
            
            fn record_failure(&mut self) {
                self.failure_count += 1;
                self.last_failure_time = Some(std::time::Instant::now());
                
                if self.failure_count >= self.failure_threshold {
                    if self.state != CircuitState::Open {
                        tracing::error!(
                            "Circuit breaker opening after {} failures",
                            self.failure_count
                        );
                        self.state = CircuitState::Open;
                    }
                }
            }
        }
    };
    
    TokenStream::from(expanded)
}
