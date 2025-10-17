//! # Responsibility
//! Implements the #[instrument] procedural macro.
//!
//! ---
//!
//! Thin wrapper around #[tracing::instrument] for consistency with
//! other Qualia macros. Provides standardized observability.

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn};

/// # Responsibility
/// Expands #[instrument] into tracing instrumentation.
pub fn expand(_attr: TokenStream, item: TokenStream) -> TokenStream {
    let input_fn = parse_macro_input!(item as ItemFn);

    let fn_name = &input_fn.sig.ident;
    let fn_vis = &input_fn.vis;
    let fn_generics = &input_fn.sig.generics;
    let fn_inputs = &input_fn.sig.inputs;
    let fn_output = &input_fn.sig.output;
    let fn_block = &input_fn.block;
    let fn_asyncness = &input_fn.sig.asyncness;

    // For now, simple passthrough. In production, we'd add actual
    // tracing::instrument integration with custom fields.
    let expanded = quote! {
        /// # Responsibility
        /// Instrumented function with automatic tracing spans.
        ///
        /// ---
        ///
        /// This function is wrapped with tracing instrumentation for
        /// observability. All calls are logged with entry/exit spans.
        #[tracing::instrument]
        #fn_vis #fn_asyncness fn #fn_name #fn_generics(#fn_inputs) #fn_output #fn_block
    };

    TokenStream::from(expanded)
}
