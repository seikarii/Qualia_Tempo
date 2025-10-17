//! # Responsibility
//! Implements the `#[cached]` procedural macro for function memoization.

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn, parse::Parse, parse::ParseStream, Token, LitInt, Ident};

/// Parse arguments for #[cached(ttl = 60)]
struct CachedArgs {
    #[allow(dead_code)] // Used in future refinement phase
    ttl_seconds: u64,
}

impl Parse for CachedArgs {
    fn parse(input: ParseStream) -> syn::Result<Self> {
        let mut ttl_seconds = 60u64;
        
        if !input.is_empty() {
            let key: Ident = input.parse()?;
            if key == "ttl" {
                input.parse::<Token![=]>()?;
                let value: LitInt = input.parse()?;
                ttl_seconds = value.base10_parse()?;
            }
        }
        
        Ok(CachedArgs { ttl_seconds })
    }
}

pub fn impl_cached(args: TokenStream, input: TokenStream) -> TokenStream {
    let input_fn = parse_macro_input!(input as ItemFn);
    
    // Parse TTL from args
    let _cached_args = if args.is_empty() {
        CachedArgs { ttl_seconds: 60 }
    } else {
        parse_macro_input!(args as CachedArgs)
    };
    
    let fn_name = &input_fn.sig.ident;
    let fn_block = &input_fn.block;
    let fn_inputs = &input_fn.sig.inputs;
    let fn_output = &input_fn.sig.output;
    let fn_vis = &input_fn.vis;
    let fn_async = &input_fn.sig.asyncness;
    
    // For MVP: Pass-through implementation (caching to be added in refinement)
    let expanded = quote! {
        #fn_vis #fn_async fn #fn_name #fn_inputs #fn_output #fn_block
    };
    
    TokenStream::from(expanded)
}
