//! # Responsibility
//! Procedural macros for Qualia Tempo (decorator replacements).

use proc_macro::TokenStream;

/// Stub for procedural macros
#[proc_macro_attribute]
pub fn handle_event(_attr: TokenStream, item: TokenStream) -> TokenStream {
    item
}
