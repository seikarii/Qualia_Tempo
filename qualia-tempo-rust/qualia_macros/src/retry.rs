//! # Responsibility
//! Implements the #[retry] procedural macro.
//!
//! ---
//!
//! Adds automatic retry logic with exponential backoff for unreliable operations.
//! Essential for network calls and external service interactions.

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, punctuated::Punctuated, Expr, ItemFn, Lit, Meta, Token};

/// # Responsibility
/// Expands #[retry(...)] into retry loop with backoff.
pub fn expand(attr: TokenStream, item: TokenStream) -> TokenStream {
    let args = parse_macro_input!(attr with Punctuated::<Meta, Token![,]>::parse_terminated);
    let input_fn = parse_macro_input!(item as ItemFn);

    // Parse retry parameters
    let mut max_attempts: u32 = 3;
    let mut delay_ms: u64 = 100;
    let mut exponential_backoff: bool = false;

    for arg in &args {
        if let Meta::NameValue(nv) = arg {
            if nv.path.is_ident("max_attempts") {
                if let Expr::Lit(expr_lit) = &nv.value {
                    if let Lit::Int(lit_int) = &expr_lit.lit {
                        max_attempts = lit_int.base10_parse().unwrap_or(3);
                    }
                }
            } else if nv.path.is_ident("delay_ms") {
                if let Expr::Lit(expr_lit) = &nv.value {
                    if let Lit::Int(lit_int) = &expr_lit.lit {
                        delay_ms = lit_int.base10_parse().unwrap_or(100);
                    }
                }
            } else if nv.path.is_ident("exponential_backoff") {
                if let Expr::Lit(expr_lit) = &nv.value {
                    if let Lit::Bool(lit_bool) = &expr_lit.lit {
                        exponential_backoff = lit_bool.value;
                    }
                }
            }
        }
    }

    let fn_name = &input_fn.sig.ident;
    let fn_vis = &input_fn.vis;
    let fn_generics = &input_fn.sig.generics;
    let fn_inputs = &input_fn.sig.inputs;
    let fn_output = &input_fn.sig.output;
    let fn_block = &input_fn.block;
    let fn_asyncness = &input_fn.sig.asyncness;

    let delay_calculation = if exponential_backoff {
        quote! {
            let current_delay = base_delay * 2u64.pow(attempt as u32);
            tokio::time::sleep(tokio::time::Duration::from_millis(current_delay)).await;
        }
    } else {
        quote! {
            tokio::time::sleep(tokio::time::Duration::from_millis(base_delay)).await;
        }
    };

    let expanded = quote! {
        /// # Responsibility
        /// Wrapper with retry logic and exponential backoff.
        ///
        /// ---
        ///
        /// Attempts operation up to max_attempts times, with configurable delay
        /// between attempts. Returns error only if all attempts fail.
        #fn_vis #fn_asyncness fn #fn_name #fn_generics(#fn_inputs) #fn_output {
            const MAX_ATTEMPTS: u32 = #max_attempts;
            const base_delay: u64 = #delay_ms;

            let mut last_error = None;

            for attempt in 0..MAX_ATTEMPTS {
                // Execute original function body inline
                let result: std::result::Result<_, _> = async #fn_block.await;
                
                match result {
                    Ok(value) => return Ok(value),
                    Err(e) => {
                        tracing::warn!(
                            function = stringify!(#fn_name),
                            attempt = attempt + 1,
                            max_attempts = MAX_ATTEMPTS,
                            error = ?e,
                            "Retry attempt failed"
                        );
                        last_error = Some(e);

                        if attempt < MAX_ATTEMPTS - 1 {
                            #delay_calculation
                        }
                    }
                }
            }

            Err(last_error.unwrap_or_else(|| {
                anyhow::anyhow!("All retry attempts exhausted for {}", stringify!(#fn_name))
            }))
        }
    };

    TokenStream::from(expanded)
}
