//! # Responsibility
//! Implements the #[validate] procedural macro.
//!
//! ---
//!
//! Generates runtime validation logic using the `validator` crate. Validates
//! function arguments before execution, returning ValidationError on failure.

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn};

/// Implementation of the validate macro
pub fn impl_validate(input: TokenStream) -> TokenStream {
    let func = parse_macro_input!(input as ItemFn);
    
    let func_name = &func.sig.ident;
    let func_vis = &func.vis;
    let func_generics = &func.sig.generics;
    let func_inputs = &func.sig.inputs;
    let func_output = &func.sig.output;
    let func_block = &func.block;
    let func_asyncness = &func.sig.asyncness;
    
    // Collect all parameters for validation
    let param_names: Vec<_> = func_inputs
        .iter()
        .filter_map(|arg| {
            if let syn::FnArg::Typed(pat_type) = arg {
                if let syn::Pat::Ident(pat_ident) = &*pat_type.pat {
                    Some(&pat_ident.ident)
                } else {
                    None
                }
            } else {
                None
            }
        })
        .collect();
    
    // Generate validation checks
    let validations = param_names.iter().map(|param| {
        quote! {
            if let Err(e) = validator::Validate::validate(#param) {
                tracing::error!(
                    "Validation failed for parameter {}: {:?}",
                    stringify!(#param),
                    e
                );
                return Err(anyhow::anyhow!("Validation error: {:?}", e));
            }
        }
    });
    
    // Build the expanded code
    let expanded = quote! {
        #func_vis #func_asyncness fn #func_name #func_generics(#func_inputs) #func_output {
            // Validation checks before execution
            #(#validations)*
            
            // Original function body
            #func_block
        }
    };
    
    TokenStream::from(expanded)
}
