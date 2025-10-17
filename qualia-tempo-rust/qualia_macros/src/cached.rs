//! # Responsibility
//! Implementation of the #[cached] procedural macro for memoization.
//!
//! ---
//!
//! Provides automatic memoization for computationally expensive functions.
//! Integrates with the `cached` crate for TTL-based and size-limited caches.

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, parse::{Parse, ParseStream}, Token, ItemFn, LitInt};

struct CachedArgs {
    ttl_seconds: Option<u64>,
}

impl Parse for CachedArgs {
    fn parse(input: ParseStream) -> syn::Result<Self> {
        let mut ttl_seconds = None;

        while !input.is_empty() {
            let key: syn::Ident = input.parse()?;
            input.parse::<Token![=]>()?;
            
            if key == "ttl" {
                let value: LitInt = input.parse()?;
                ttl_seconds = Some(value.base10_parse()?);
            }

            if !input.is_empty() {
                input.parse::<Token![,]>()?;
            }
        }

        Ok(CachedArgs { ttl_seconds })
    }
}

/// # Responsibility
/// Expands the #[cached] attribute macro into memoization wrapper code.
pub fn expand(args: TokenStream, input: TokenStream) -> TokenStream {
    let input_fn = parse_macro_input!(input as ItemFn);
    let args = if args.is_empty() {
        CachedArgs { ttl_seconds: None }
    } else {
        parse_macro_input!(args as CachedArgs)
    };
    
    let ttl_seconds = args.ttl_seconds;

    let fn_vis = &input_fn.vis;
    let fn_sig = &input_fn.sig;
    let fn_name = &fn_sig.ident;
    let fn_block = &input_fn.block;
    let fn_attrs = &input_fn.attrs;
    let fn_generics = &fn_sig.generics;
    let fn_inputs = &fn_sig.inputs;
    let fn_output = &fn_sig.output;
    let fn_asyncness = &fn_sig.asyncness;

    // Generate cache key from function parameters
    let cache_key_fields: Vec<_> = fn_inputs
        .iter()
        .filter_map(|arg| {
            if let syn::FnArg::Typed(pat_type) = arg {
                Some(&pat_type.pat)
            } else {
                None
            }
        })
        .collect();

    // Generate inner function name
    let inner_fn_name = syn::Ident::new(
        &format!("{}_inner", fn_name),
        proc_macro2::Span::call_site(),
    );

    let cache_impl = if let Some(ttl) = ttl_seconds {
        // TTL-based cache
        quote! {
            use cached::TimedCache;
            use cached::Cached;
            use std::sync::Mutex;
            use once_cell::sync::Lazy;

            static CACHE: Lazy<Mutex<TimedCache<String, _>>> = Lazy::new(|| {
                Mutex::new(TimedCache::with_lifespan(#ttl))
            });

            // Generate cache key from parameters
            let cache_key = format!("{:?}", (#(#cache_key_fields),*));

            // Try to get from cache
            if let Ok(mut cache) = CACHE.lock() {
                if let Some(cached_result) = cache.cache_get(&cache_key) {
                    return cached_result.clone();
                }
            }

            // Compute result
            let result = #inner_fn_name(#(#cache_key_fields),*).await;

            // Store in cache
            if let Ok(mut cache) = CACHE.lock() {
                cache.cache_set(cache_key, result.clone());
            }

            result
        }
    } else {
        // Unbounded cache (no TTL)
        quote! {
            use cached::UnboundCache;
            use cached::Cached;
            use std::sync::Mutex;
            use once_cell::sync::Lazy;

            static CACHE: Lazy<Mutex<UnboundCache<String, _>>> = Lazy::new(|| {
                Mutex::new(UnboundCache::new())
            });

            let cache_key = format!("{:?}", (#(#cache_key_fields),*));

            if let Ok(mut cache) = CACHE.lock() {
                if let Some(cached_result) = cache.cache_get(&cache_key) {
                    return cached_result.clone();
                }
            }

            let result = #inner_fn_name(#(#cache_key_fields),*).await;

            if let Ok(mut cache) = CACHE.lock() {
                cache.cache_set(cache_key, result.clone());
            }

            result
        }
    };

    let expanded = quote! {
        #(#fn_attrs)*
        #fn_vis #fn_asyncness fn #fn_name #fn_generics(#fn_inputs) #fn_output {
            // Inner function with actual logic
            async fn #inner_fn_name #fn_generics(#fn_inputs) #fn_output {
                #fn_block
            }

            #cache_impl
        }
    };

    TokenStream::from(expanded)
}
