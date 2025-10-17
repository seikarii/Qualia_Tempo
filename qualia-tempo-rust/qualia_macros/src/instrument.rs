//! # Responsibility
//! Implements the #[instrument] macro for tracing instrumentation.

use proc_macro2::TokenStream;
use quote::quote;
use syn::{parse2, ItemFn, Result};

pub fn impl_instrument(_attr: TokenStream, item: TokenStream) -> Result<TokenStream> {
    let func: ItemFn = parse2(item)?;
    
    let expanded = quote! {
        #[tracing::instrument(skip(self), err)]
        #func
    };
    
    Ok(expanded)
}
