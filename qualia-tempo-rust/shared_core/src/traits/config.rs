//! # Responsibility
//! Defines configuration-related traits for validation and loading.

use anyhow::Result;

/// # Responsibility
/// Trait for configuration structures that can be validated.
///
/// ---
///
/// All configuration structs should implement this to ensure they contain
/// valid values before being used by services.
pub trait ValidatableConfig {
    /// Validates the configuration values
    ///
    /// # Errors
    ///
    /// Returns an error if any configuration value is invalid
    fn validate(&self) -> Result<()>;
}

/// # Responsibility
/// Trait for configuration structures that can be loaded from files.
///
/// ---
///
/// Provides a standard interface for loading configuration from YAML, JSON,
/// RON, or other formats.
pub trait LoadableConfig: Sized {
    /// Loads configuration from a file path
    ///
    /// # Errors
    ///
    /// Returns an error if the file cannot be read or parsed
    fn load_from_path(path: &str) -> Result<Self>;

    /// Loads configuration from environment variables (if applicable)
    ///
    /// # Errors
    ///
    /// Returns an error if required environment variables are missing
    fn load_from_env() -> Result<Self>;
}
