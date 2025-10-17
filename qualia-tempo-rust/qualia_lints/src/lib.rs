//! # Responsibility  
//! Placeholder crate that enforces architectural lints via build.rs.
//!
//! ---
//!
//! The actual lint enforcement happens in build.rs, which runs on every
//! `cargo build` and fails compilation if violations are detected.

// This crate has no runtime code - all enforcement is build-time
