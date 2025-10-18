//! # Responsibility
//! Defines configuration-related traits.
//!
//! ---
//!
//! Contains traits for loading and validating configuration.

use anyhow::Result;

/// # Responsibility
/// Trait for types that can be loaded from configuration files.
///
/// ---
///
/// Typically implemented for service config structs (e.g., GameLogicConfig).
pub trait LoadableConfig: Sized {
    /// Load configuration from file path
    ///
    /// # Arguments
    /// * `path` - Path to configuration file (YAML, TOML, JSON)
    ///
    /// # Returns
    /// Ok(config) on success, Err on parse/IO failure
    fn load_from_file(path: &str) -> Result<Self>;

    /// Validate configuration after loading
    ///
    /// # Returns
    /// Ok(()) if valid, Err with validation errors
    fn validate(&self) -> Result<()> {
        Ok(()) // Default: no validation
    }
}
