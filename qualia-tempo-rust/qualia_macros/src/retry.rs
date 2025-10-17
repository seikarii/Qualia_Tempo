//! # Responsibility
//! Implements the #[retry] macro for automatic retry logic with exponential backoff.

use proc_macro2::TokenStream;
use quote::quote;
use syn::{parse2, ItemFn, Result};

pub fn impl_retry(_attr: TokenStream, item: TokenStream) -> Result<TokenStream> {
    let func: ItemFn = parse2(item)?;
    
    // Pass through for now (full implementation needs retry logic generation)
    let expanded = quote! {
        #func
    };
    
    Ok(expanded)
}
