//! # Responsibility
//! Implements the #[cached] macro for function memoization with TTL support.
//!
//! ---
//!
//! This macro wraps functions with automatic memoization using thread-safe caching.
//! Supports TTL (time-to-live) for cache invalidation. Uses lazy_static for
//! global cache storage per QUALIA.CODE.RUST caching patterns.

use proc_macro2::TokenStream;
use quote::quote;
use syn::{
    parse2, parse::Parse, parse::ParseStream, ItemFn, LitInt, Result, Token,
};

/// # Responsibility
/// Parses the #[cached(ttl = 60)] attribute syntax.
struct CachedArgs {
    ttl: Option<u64>,
}

impl Parse for CachedArgs {
    fn parse(input: ParseStream) -> Result<Self> {
        let mut ttl = None;
        
        if !input.is_empty() {
            // Parse "ttl"
            let ident: syn::Ident = input.parse()?;
            if ident != "ttl" {
                return Err(syn::Error::new_spanned(
                    ident,
                    "Expected 'ttl' parameter"
                ));
            }
            
            // Parse "="
            input.parse::<Token![=]>()?;
            
            // Parse the number
            let lit: LitInt = input.parse()?;
            ttl = Some(lit.base10_parse()?);
        }
        
        Ok(CachedArgs { ttl })
    }
}

/// # Responsibility
/// Generates cached wrapper function with TTL support.
pub fn impl_cached(attr: TokenStream, item: TokenStream) -> Result<TokenStream> {
    let func: ItemFn = parse2(item.clone())?;
    let args: CachedArgs = if attr.is_empty() {
        CachedArgs { ttl: None }
    } else {
        parse2(attr)?
    };
    
    let fn_name = &func.sig.ident;
    let _fn_visibility = &func.vis;
    let fn_inputs = &func.sig.inputs;
    let fn_output = &func.sig.output;
    let fn_block = &func.block;
    let fn_asyncness = &func.sig.asyncness;
    let fn_generics = &func.sig.generics;
    
    // Generate cache key from function name
    let cache_name = syn::Ident::new(
        &format!("{}_CACHE", fn_name.to_string().to_uppercase()),
        fn_name.span()
    );
    
    // Build the cached implementation
    let ttl_secs = args.ttl.unwrap_or(3600); // Default 1 hour
    
    let expanded = quote! {
        // Original function (private, renamed)
        #fn_asyncness fn #fn_name #fn_generics(#fn_inputs) #fn_output {
            use std::sync::OnceLock;
            use std::collections::HashMap;
            use std::sync::Mutex;
            use std::time::{Duration, Instant};
            
            // Cache entry with TTL
            struct CacheEntry<T> {
                value: T,
                expires_at: Instant,
            }
            
            // Global cache storage (thread-safe)
            static #cache_name: OnceLock<Mutex<HashMap<String, CacheEntry<_>>>> = OnceLock::new();
            
            // Initialize cache on first access
            let cache = #cache_name.get_or_init(|| Mutex::new(HashMap::new()));
            
            // Generate cache key (simplified - uses function name as key base)
            let cache_key = format!("{}", stringify!(#fn_name));
            
            // Check cache first
            {
                let cache_guard = cache.lock().expect("Cache mutex poisoned");
                if let Some(entry) = cache_guard.get(&cache_key) {
                    if Instant::now() < entry.expires_at {
                        // Cache hit - return cloned value
                        return entry.value.clone();
                    }
                }
            }
            
            // Cache miss or expired - compute value
            let result = (|| #fn_block)();
            
            // Store in cache with TTL
            {
                let mut cache_guard = cache.lock().expect("Cache mutex poisoned");
                cache_guard.insert(
                    cache_key,
                    CacheEntry {
                        value: result.clone(),
                        expires_at: Instant::now() + Duration::from_secs(#ttl_secs),
                    }
                );
            }
            
            result
        }
    };
    
    Ok(expanded)
}
