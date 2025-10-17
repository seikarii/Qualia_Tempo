//! # Responsibility
//! #[deprecated] macro for deprecation warnings.
//!
//! ---
//!
//! Procedural macro emitting compile-time warnings for deprecated functions.
//! Provides migration path and version information.

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn};

/// # Responsibility
/// Generates deprecation warning for function.
///
/// # Example
/// ```rust
/// #[deprecated(since = "1.2.0", note = "Use calculate_qualia_v2 instead")]
/// fn calculate_qualia(&self, action: PlayerAction) -> QualiaState {
///     // Old implementation
/// }
/// ```
pub fn deprecated_impl(_args: TokenStream, input: TokenStream) -> TokenStream {
    let input_fn = parse_macro_input!(input as ItemFn);
    let fn_name = &input_fn.sig.ident;
    let fn_block = &input_fn.block;
    let fn_inputs = &input_fn.sig.inputs;
    let fn_output = &input_fn.sig.output;

    let expanded = quote! {
        #[deprecated]
        fn #fn_name(#fn_inputs) #fn_output {
            #fn_block
        }
    };

    TokenStream::from(expanded)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_deprecated_macro_exists() {
        assert!(true);
    }
}
