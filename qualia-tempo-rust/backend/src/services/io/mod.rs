//! # Responsibility
//! I/O services module aggregator.
//!
//! ---
//!
//! Exports all I/O services (filesystem, environment detection).

pub mod filesystem;
pub mod environment;

pub use filesystem::FileSystemService;
pub use environment::EnvironmentService;
