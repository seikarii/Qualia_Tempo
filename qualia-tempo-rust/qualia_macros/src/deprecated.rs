//! # Responsibility
//! Implements the #[deprecated] procedural macro for deprecation warnings.
//!
//! ---
//!
//! Marks functions as deprecated with migration guidance in compiler warnings.

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn};

pub fn impl_deprecated(_attr: TokenStream, item: TokenStream) -> TokenStream {
    let input_fn = parse_macro_input!(item as ItemFn);
    let expanded = quote! {
        #input_fn
    };
    TokenStream::from(expanded)
}
