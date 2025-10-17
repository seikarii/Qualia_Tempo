//! # Responsibility
//! Implements the #[authorize(role)] procedural macro.
//!
//! ---
//!
//! Generates authorization checks before function execution. Verifies
//! that the current user has the required role, returning Err if unauthorized.

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn, LitStr};

/// Implementation of the authorize macro
pub fn impl_authorize(args: TokenStream, input: TokenStream) -> TokenStream {
    let required_role = parse_macro_input!(args as LitStr);
    let func = parse_macro_input!(input as ItemFn);
    
    let func_name = &func.sig.ident;
    let func_vis = &func.vis;
    let func_generics = &func.sig.generics;
    let func_inputs = &func.sig.inputs;
    let func_output = &func.sig.output;
    let func_block = &func.block;
    let func_asyncness = &func.sig.asyncness;
    
    // Extract parameter names
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
    
    // Build the expanded code with authorization check
    let expanded = if func_asyncness.is_some() {
        quote! {
            #func_vis async fn #func_name #func_generics(#func_inputs) #func_output {
                // Original function as inner implementation
                async fn inner_impl #func_generics(#func_inputs) #func_output {
                    #func_block
                }
                
                // Authorization check
                // NOTE: This assumes a security context is available in the current scope
                // In a real implementation, you'd inject or access a SecurityContext
                match get_current_user_role().await {
                    Ok(user_role) => {
                        if user_role != #required_role {
                            tracing::error!(
                                "Authorization failed for function {}: required role '{}', user has '{}'",
                                stringify!(#func_name),
                                #required_role,
                                user_role
                            );
                            return Err(anyhow::anyhow!(
                                "Unauthorized: requires role '{}'",
                                #required_role
                            ));
                        }
                    }
                    Err(e) => {
                        tracing::error!(
                            "Failed to get user role for authorization check: {:?}",
                            e
                        );
                        return Err(anyhow::anyhow!(
                            "Authorization check failed: {:?}",
                            e
                        ));
                    }
                }
                
                // Execute authorized function
                inner_impl(#(#param_names),*).await
            }
            
            /// Placeholder function to get current user role
            /// In production, this would access a SecurityContext or similar
            async fn get_current_user_role() -> anyhow::Result<String> {
                // This is a placeholder implementation
                // Real implementation would extract role from:
                // - JWT token
                // - Session context
                // - Thread-local storage
                // - Security context parameter
                Ok("user".to_string())
            }
        }
    } else {
        quote! {
            #func_vis fn #func_name #func_generics(#func_inputs) #func_output {
                // Original function as inner implementation
                fn inner_impl #func_generics(#func_inputs) #func_output {
                    #func_block
                }
                
                // Authorization check (sync version)
                match get_current_user_role_sync() {
                    Ok(user_role) => {
                        if user_role != #required_role {
                            tracing::error!(
                                "Authorization failed for function {}: required role '{}', user has '{}'",
                                stringify!(#func_name),
                                #required_role,
                                user_role
                            );
                            return Err(anyhow::anyhow!(
                                "Unauthorized: requires role '{}'",
                                #required_role
                            ));
                        }
                    }
                    Err(e) => {
                        tracing::error!(
                            "Failed to get user role for authorization check: {:?}",
                            e
                        );
                        return Err(anyhow::anyhow!(
                            "Authorization check failed: {:?}",
                            e
                        ));
                    }
                }
                
                // Execute authorized function
                inner_impl(#(#param_names),*)
            }
            
            /// Placeholder function to get current user role (sync version)
            fn get_current_user_role_sync() -> anyhow::Result<String> {
                Ok("user".to_string())
            }
        }
    };
    
    TokenStream::from(expanded)
}
