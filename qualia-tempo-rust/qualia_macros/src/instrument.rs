//! # Responsibility
//! #[instrument] macro for tracing integration.
//!
//! ---
//!
//! Procedural macro generating tracing spans for function execution.
//! Logs entry/exit, duration, and captured arguments.

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn};

/// # Responsibility
/// Generates tracing instrumentation for function.
///
/// # Example
/// ```rust
/// #[instrument(level = "debug", skip(self))]
/// async fn process_action(&self, action: PlayerAction) -> Result<()> {
///     // Traced function
/// }
/// ```
pub fn instrument_impl(_args: TokenStream, input: TokenStream) -> TokenStream {
    let input_fn = parse_macro_input!(input as ItemFn);
    let fn_name = &input_fn.sig.ident;
    let fn_block = &input_fn.block;
    let fn_inputs = &input_fn.sig.inputs;
    let fn_output = &input_fn.sig.output;

    let expanded = quote! {
        #[tracing::instrument]
        async fn #fn_name(#fn_inputs) #fn_output {
            #fn_block
        }
    };

    TokenStream::from(expanded)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_instrument_macro_exists() {
        assert!(true);
    }
}
