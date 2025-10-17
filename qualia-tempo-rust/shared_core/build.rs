//! # Responsibility
//! Enforces architectural lints for shared_core crate.

fn main() {
    // The qualia_lints dependency will run its build.rs automatically
    // This file exists to trigger the dependency chain
    println!("cargo:rerun-if-changed=src");
}
