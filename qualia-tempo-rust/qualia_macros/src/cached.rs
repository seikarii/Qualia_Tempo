//! # Responsibility
//! Implements the #[cached] macro for function memoization.

use proc_macro2::TokenStream;
use quote::quote;
use syn::{parse2, ItemFn, Result};

pub fn impl_cached(_attr: TokenStream, item: TokenStream) -> Result<TokenStream> {
    let func: ItemFn = parse2(item)?;
    
    // For now, pass through (full implementation requires cached crate integration)
    let expanded = quote! {
        #func
    };
    
    Ok(expanded)
}
