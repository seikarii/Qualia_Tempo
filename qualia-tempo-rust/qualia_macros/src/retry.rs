//! # Responsibility
//! Implementation of the #[retry] procedural macro for resilient operations.
//!
//! ---
//!
//! Provides automatic retry logic with exponential backoff for operations
//! that may fail transiently (network I/O, external services).

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, parse::{Parse, ParseStream}, Token, ItemFn, LitInt, LitBool};

struct RetryArgs {
    max_attempts: u32,
    delay_ms: u64,
    exponential_backoff: bool,
}

impl Parse for RetryArgs {
    fn parse(input: ParseStream) -> syn::Result<Self> {
        let mut max_attempts = 3;
        let mut delay_ms = 100;
        let mut exponential_backoff = false;

        while !input.is_empty() {
            let key: syn::Ident = input.parse()?;
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

        Ok(RetryArgs {
            max_attempts,
            delay_ms,
            exponential_backoff,
        })
    }
}

/// # Responsibility
/// Expands the #[retry] attribute macro into retry wrapper with backoff.
pub fn expand(args: TokenStream, input: TokenStream) -> TokenStream {
    let input_fn = parse_macro_input!(input as ItemFn);
    let args = if args.is_empty() {
        RetryArgs {
            max_attempts: 3,
            delay_ms: 100,
            exponential_backoff: false,
        }
    } else {
        parse_macro_input!(args as RetryArgs)
    };

    let max_attempts = args.max_attempts;
    let delay_ms = args.delay_ms;
    let exponential_backoff = args.exponential_backoff;

    let fn_vis = &input_fn.vis;
    let fn_sig = &input_fn.sig;
    let fn_name = &fn_sig.ident;
    let fn_block = &input_fn.block;
    let fn_attrs = &input_fn.attrs;
    let fn_generics = &fn_sig.generics;
    let fn_inputs = &fn_sig.inputs;
    let fn_output = &fn_sig.output;
    let fn_asyncness = &fn_sig.asyncness;

    // Generate parameter names for retry calls
    let param_names: Vec<_> = fn_inputs
        .iter()
        .filter_map(|arg| {
            if let syn::FnArg::Typed(pat_type) = arg {
                Some(&pat_type.pat)
            } else {
                None
            }
        })
        .collect();

    let inner_fn_name = syn::Ident::new(
        &format!("{}_inner", fn_name),
        proc_macro2::Span::call_site(),
    );

    let retry_logic = if exponential_backoff {
        quote! {
            let mut attempt = 0u32;
            let mut current_delay = #delay_ms;

            loop {
                attempt += 1;

                match #inner_fn_name(#(#param_names),*).await {
                    Ok(result) => return Ok(result),
                    Err(e) if attempt >= #max_attempts => {
                        tracing::error!(
                            function = stringify!(#fn_name),
                            attempts = attempt,
                            error = ?e,
                            "Max retry attempts exceeded"
                        );
                        return Err(e);
                    }
                    Err(e) => {
                        tracing::warn!(
                            function = stringify!(#fn_name),
                            attempt = attempt,
                            max_attempts = #max_attempts,
                            delay_ms = current_delay,
                            error = ?e,
                            "Operation failed, retrying with exponential backoff"
                        );
                        tokio::time::sleep(tokio::time::Duration::from_millis(current_delay)).await;
                        current_delay *= 2; // Exponential backoff
                    }
                }
            }
        }
    } else {
        quote! {
            let mut attempt = 0u32;

            loop {
                attempt += 1;

                match #inner_fn_name(#(#param_names),*).await {
                    Ok(result) => return Ok(result),
                    Err(e) if attempt >= #max_attempts => {
                        tracing::error!(
                            function = stringify!(#fn_name),
                            attempts = attempt,
                            error = ?e,
                            "Max retry attempts exceeded"
                        );
                        return Err(e);
                    }
                    Err(e) => {
                        tracing::warn!(
                            function = stringify!(#fn_name),
                            attempt = attempt,
                            max_attempts = #max_attempts,
                            delay_ms = #delay_ms,
                            error = ?e,
                            "Operation failed, retrying"
                        );
                        tokio::time::sleep(tokio::time::Duration::from_millis(#delay_ms)).await;
                    }
                }
            }
        }
    };

    let expanded = quote! {
        #(#fn_attrs)*
        #fn_vis #fn_asyncness fn #fn_name #fn_generics(#fn_inputs) #fn_output {
            async fn #inner_fn_name #fn_generics(#fn_inputs) #fn_output {
                #fn_block
            }

            #retry_logic
        }
    };

    TokenStream::from(expanded)
}
