//! # Responsibility
//! Implements the #[mutex] procedural macro for automatic locking.
//!
//! ---
//!
//! NOTE: This macro is intentionally minimal as it's better to use explicit
//! Arc<Mutex<T>> in code rather than hidden locking. Included for completeness
//! as per PLAN.md but discouraged in production code per QUALIA.CODE.RUST.

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn};

/// # Responsibility
/// Entry point for #[mutex] macro expansion.
///
/// ---
///
/// DISCOURAGED: This macro is a pass-through placeholder.
/// Prefer explicit Arc<Mutex<T>> in code for clarity per QUALIA.CODE.RUST §4.1.
pub fn impl_mutex(item: TokenStream) -> TokenStream {
    let input_fn = parse_macro_input!(item as ItemFn);
    
    let fn_name = &input_fn.sig.ident;
    let fn_vis = &input_fn.vis;
    let fn_block = &input_fn.block;
    let fn_inputs = &input_fn.sig.inputs;
    let fn_output = &input_fn.sig.output;
    let fn_asyncness = &input_fn.sig.asyncness;
    let fn_generics = &input_fn.sig.generics;
    
    let expanded = quote! {
        /// # Responsibility
        /// Function with mutex annotation (explicit locking preferred).
        ///
        /// ---
        ///
        /// NOTE: This macro does NOT add automatic locking. Use explicit
        /// Arc<Mutex<T>> or Arc<RwLock<T>> in function body instead.
        #fn_vis #fn_asyncness fn #fn_name #fn_generics (#fn_inputs) #fn_output {
            #fn_block
        }
    };
    
    TokenStream::from(expanded)
}
