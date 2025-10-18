//! # Responsibility
//! Loads configuration from YAML files with error handling.
//!
//! ---
//!
//! Generic loader that can deserialize any config struct from YAML.

use serde::Deserialize;
use anyhow::{Context, Result};
use std::path::Path;

/// # Responsibility
/// Generic YAML configuration loader with proper error context.
///
/// ---
///
/// Reads YAML file and deserializes into the target type T.
/// Provides detailed error messages for debugging config issues.
///
/// # Errors
///
/// Returns an error if:
/// - The file cannot be read (missing, permissions, etc.)
/// - The YAML content is malformed or cannot be parsed
pub fn load_config<T>(path: impl AsRef<Path>) -> Result<T>
where
    T: for<'de> Deserialize<'de>,
{
    let path = path.as_ref();
    let contents = std::fs::read_to_string(path)
        .with_context(|| format!("Failed to read config file: {}", path.display()))?;

    serde_yaml::from_str(&contents)
        .with_context(|| format!("Failed to parse YAML config: {}", path.display()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::Deserialize;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[derive(Debug, Deserialize, PartialEq)]
    struct TestConfig {
        value: String,
        number: i32,
    }

    #[test]
    fn test_load_valid_config() {
        let mut temp_file = NamedTempFile::new().unwrap();
        writeln!(temp_file, "value: test").unwrap();
        writeln!(temp_file, "number: 42").unwrap();
        temp_file.flush().unwrap();

        let config: TestConfig = load_config(temp_file.path()).unwrap();
        assert_eq!(config.value, "test");
        assert_eq!(config.number, 42);
    }

    #[test]
    fn test_load_invalid_yaml() {
        let mut temp_file = NamedTempFile::new().unwrap();
        writeln!(temp_file, "value: [unclosed array").unwrap();
        temp_file.flush().unwrap();

        let result: Result<TestConfig> = load_config(temp_file.path());
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Failed to parse YAML"));
    }

    #[test]
    fn test_load_missing_file() {
        let result: Result<TestConfig> = load_config("/nonexistent/path/config.yaml");
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Failed to read config file"));
    }
}
