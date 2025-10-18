//! # Responsibility
//! Implements the #[deprecated] procedural macro for deprecation warnings.
//!
//! ---
//!
//! Marks functions as deprecated with migration guidance in compiler warnings.
//! Emits compile-time warnings when deprecated functions are used.

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn, Meta, Token};
use syn::parse::{Parse, ParseStream};

struct DeprecatedArgs {
    since: String,
    note: Option<String>,
}

impl Parse for DeprecatedArgs {
    fn parse(input: ParseStream) -> syn::Result<Self> {
        let mut since = String::from("unknown");
        let mut note = None;
        
        while !input.is_empty() {
            let meta: Meta = input.parse()?;
            if let Meta::NameValue(nv) = meta {
                if nv.path.is_ident("since") {
                    if let syn::Expr::Lit(expr_lit) = nv.value {
                        if let syn::Lit::Str(lit) = expr_lit.lit {
                            since = lit.value();
                        }
                    }
                } else if nv.path.is_ident("note") {
                    if let syn::Expr::Lit(expr_lit) = nv.value {
                        if let syn::Lit::Str(lit) = expr_lit.lit {
                            note = Some(lit.value());
                        }
                    }
                }
            }
            
            if !input.is_empty() {
                input.parse::<Token![,]>()?;
            }
        }
        
        Ok(DeprecatedArgs { since, note })
    }
}

/// # Responsibility
/// Entry point for #[deprecated] macro expansion.
///
/// ---
///
/// Adds #[deprecated] attribute with custom message to function.
pub fn impl_deprecated(attr: TokenStream, item: TokenStream) -> TokenStream {
    let args = parse_macro_input!(attr as DeprecatedArgs);
    let input_fn = parse_macro_input!(item as ItemFn);

    let since = args.since;
    let note = args.note.unwrap_or_else(|| "This function is deprecated".to_string());

    let fn_name = &input_fn.sig.ident;
    let fn_vis = &input_fn.vis;
    let fn_block = &input_fn.block;
    let fn_inputs = &input_fn.sig.inputs;
    let fn_output = &input_fn.sig.output;
    let fn_asyncness = &input_fn.sig.asyncness;
    let fn_generics = &input_fn.sig.generics;

    let expanded = quote! {
        /// # Responsibility
        /// Deprecated function - see compiler warning for migration guidance.
        #[deprecated(since = #since, note = #note)]
        #fn_vis #fn_asyncness fn #fn_name #fn_generics (#fn_inputs) #fn_output {
            #fn_block
        }
    };

    TokenStream::from(expanded)
}
