//! # Responsibility
//! Implements the #[timeout] procedural macro.
//!
//! ---
//!
//! Wraps async functions with tokio::time::timeout to prevent indefinite hangs.
//! Essential for operations that interact with external systems.

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, punctuated::Punctuated, Expr, ItemFn, Lit, Meta, Token};

/// # Responsibility
/// Expands #[timeout(milliseconds)] into timeout-wrapped function.
pub fn expand(attr: TokenStream, item: TokenStream) -> TokenStream {
    let args = parse_macro_input!(attr with Punctuated::<Meta, Token![,]>::parse_terminated);
    let input_fn = parse_macro_input!(item as ItemFn);

    // Parse timeout duration from first argument (should be a literal integer)
    let timeout_ms: u64 = if let Some(first_arg) = args.first() {
        match first_arg {
            Meta::Path(path) => {
                // Try to parse path as number (e.g., #[timeout(5000)])
                path.get_ident()
                    .and_then(|ident| ident.to_string().parse().ok())
                    .unwrap_or(5000)
            }
            Meta::NameValue(nv) if nv.path.is_ident("timeout") => {
                // Parse from timeout = 5000
                if let Expr::Lit(expr_lit) = &nv.value {
                    if let Lit::Int(lit_int) = &expr_lit.lit {
                        lit_int.base10_parse().unwrap_or(5000)
                    } else {
                        5000
                    }
                } else {
                    5000
                }
            }
            _ => 5000,
        }
    } else {
        5000 // Default 5 seconds
    };

    let fn_name = &input_fn.sig.ident;
    let fn_vis = &input_fn.vis;
    let fn_generics = &input_fn.sig.generics;
    let fn_inputs = &input_fn.sig.inputs;
    let fn_output = &input_fn.sig.output;
    let fn_block = &input_fn.block;
    let fn_asyncness = &input_fn.sig.asyncness;

    let expanded = quote! {
        /// # Responsibility
        /// Wrapper with timeout protection.
        ///
        /// ---
        ///
        /// Enforces maximum execution time to prevent indefinite hangs.
        /// Returns timeout error if operation exceeds limit.
        #fn_vis #fn_asyncness fn #fn_name #fn_generics(#fn_inputs) #fn_output {
            const TIMEOUT_MS: u64 = #timeout_ms;

            match tokio::time::timeout(
                tokio::time::Duration::from_millis(TIMEOUT_MS),
                async #fn_block
            ).await {
                Ok(result) => result,
                Err(_elapsed) => {
                    tracing::error!(
                        function = stringify!(#fn_name),
                        timeout_ms = TIMEOUT_MS,
                        "Operation timed out"
                    );
                    Err(anyhow::anyhow!(
                        "Operation {} timed out after {}ms",
                        stringify!(#fn_name),
                        TIMEOUT_MS
                    ))
                }
            }
        }
    };

    TokenStream::from(expanded)
}
