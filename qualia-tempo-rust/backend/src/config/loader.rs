//! # Responsibility
//! Provides YAML configuration loading utilities.
//!
//! ---
//!
//! Generic loader for deserializing YAML files into configuration structs.

use anyhow::{Context, Result};
use serde::Deserialize;
use std::fs;

/// # Responsibility
/// Loads a YAML configuration file and deserializes it into type T.
///
/// ---
///
/// # Arguments
/// - `path`: Path to the YAML configuration file
///
/// # Returns
/// - `Ok(T)`: Successfully loaded and deserialized configuration
/// - `Err`: File read or deserialization error
///
/// # Example
/// ```ignore
/// let config: ServerConfig = load_config("config/server.yaml")?;
/// ```
pub fn load_config<T>(path: &str) -> Result<T>
where
    T: for<'de> Deserialize<'de>,
{
    let contents = fs::read_to_string(path)
        .with_context(|| format!("Failed to read config file: {}", path))?;

    serde_yaml::from_str(&contents)
        .with_context(|| format!("Failed to parse YAML config: {}", path))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::Deserialize;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[derive(Debug, Deserialize, PartialEq)]
    struct TestConfig {
        name: String,
        value: i32,
    }

    #[test]
    fn test_load_config_success() {
        let yaml_content = "name: test\nvalue: 42\n";
        
        let mut temp_file = NamedTempFile::new().unwrap();
        temp_file.write_all(yaml_content.as_bytes()).unwrap();
        let temp_path = temp_file.path().to_str().unwrap();

        let config: TestConfig = load_config(temp_path).unwrap();
        
        assert_eq!(config.name, "test");
        assert_eq!(config.value, 42);
    }

    #[test]
    fn test_load_config_file_not_found() {
        let result: Result<TestConfig> = load_config("nonexistent.yaml");
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Failed to read config file"));
    }

    #[test]
    fn test_load_config_invalid_yaml() {
        let invalid_yaml = "{ invalid yaml content ][";
        
        let mut temp_file = NamedTempFile::new().unwrap();
        temp_file.write_all(invalid_yaml.as_bytes()).unwrap();
        let temp_path = temp_file.path().to_str().unwrap();

        let result: Result<TestConfig> = load_config(temp_path);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Failed to parse YAML config"));
    }
}
