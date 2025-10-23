//! # Responsibility
//! Configuration persistence layer with cross-platform directory support.

use super::app_config::AppConfig;
use std::fs;
use std::io;
use std::path::PathBuf;
use tracing::{info, warn};
use validator::Validate;

const CONFIG_FILENAME: &str = "audio-forge.yaml";
const APP_NAME: &str = "audio-forge";

/// # Responsibility
/// Load configuration from platform-specific config directory.
///
/// ---
///
/// Paths by platform:
/// - Linux: ~/.config/audio-forge/audio-forge.yaml
/// - Windows: %APPDATA%\audio-forge\audio-forge.yaml
/// - macOS: ~/Library/Application Support/audio-forge/audio-forge.yaml
///
/// Returns default config if file doesn't exist (first run).
pub fn load_config() -> io::Result<AppConfig> {
    let config_path = get_config_path()?;
    
    if !config_path.exists() {
        info!("No config file found, using defaults: {:?}", config_path);
        return Ok(AppConfig::default());
    }
    
    let contents = fs::read_to_string(&config_path)?;
    
    let config: AppConfig = serde_yaml::from_str(&contents)
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))?;
    
    // Validate configuration before returning
    if let Err(e) = config.validate() {
        warn!("⚠️ Config validation failed, using defaults: {}", e);
        return Ok(AppConfig::default());
    }
    
    info!("✅ Config loaded from: {:?}", config_path);
    Ok(config)
}

/// # Responsibility
/// Save configuration to platform-specific config directory.
///
/// ---
///
/// Creates parent directories if they don't exist.
/// Writes human-readable YAML format.
pub fn save_config(config: &AppConfig) -> io::Result<()> {
    // Validate configuration before saving
    config.validate()
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidInput, format!("Invalid config: {}", e)))?;
    
    let config_path = get_config_path()?;
    
    // Ensure parent directory exists
    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent)?;
    }
    
    let yaml = serde_yaml::to_string(config)
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))?;
    
    fs::write(&config_path, yaml)?;
    
    info!("✅ Config saved to: {:?}", config_path);
    Ok(())
}

/// # Responsibility
/// Get platform-specific config file path.
///
/// ---
///
/// Uses `dirs` crate for cross-platform directory detection.
fn get_config_path() -> io::Result<PathBuf> {
    let base_dir = dirs::config_dir()
        .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "Config directory not supported on this platform"))?;
    
    let app_dir = base_dir.join(APP_NAME);
    Ok(app_dir.join(CONFIG_FILENAME))
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_config_path_creation() {
        let path = get_config_path();
        assert!(path.is_ok(), "Should get valid config path");
        
        let path = path.unwrap();
        assert!(path.ends_with(CONFIG_FILENAME), "Should end with config filename");
    }
    
    #[test]
    fn test_default_config_serialization() {
        let config = AppConfig::default();
        let yaml = serde_yaml::to_string(&config);
        assert!(yaml.is_ok(), "Should serialize default config");
        
        let yaml_str = yaml.unwrap();
        assert!(yaml_str.contains("audio"), "Should contain audio section");
        assert!(yaml_str.contains("effects"), "Should contain effects section");
        assert!(yaml_str.contains("visualization"), "Should contain visualization section");
    }
    
    #[test]
    fn test_config_roundtrip() {
        let original = AppConfig::default();
        let yaml = serde_yaml::to_string(&original).unwrap();
        let deserialized: AppConfig = serde_yaml::from_str(&yaml).unwrap();
        
        assert_eq!(original.audio.default_volume, deserialized.audio.default_volume);
        assert_eq!(original.visualization.update_rate_fps, deserialized.visualization.update_rate_fps);
    }
}
