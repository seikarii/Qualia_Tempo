//! # Responsibility
//! Configuration loading and management.

pub mod boss_ai;
pub mod game_logic;
pub mod pattern_system;
pub mod server;

pub use boss_ai::BossAIConfig;
pub use game_logic::GameLogicConfig;
pub use pattern_system::{PatternSystemConfig, ComboPattern};
pub use server::ServerConfig;

use anyhow::{Context, Result};
use std::path::Path;

/// # Responsibility
/// Loads configuration from YAML file.
///
/// ---
///
/// Generic configuration loader for all config types.
pub fn load_config<T: serde::de::DeserializeOwned>(path: &Path) -> Result<T> {
    let contents = std::fs::read_to_string(path)
        .context(format!("Failed to read config file: {:?}", path))?;
    
    let config: T = serde_yaml::from_str(&contents)
        .context(format!("Failed to parse YAML config: {:?}", path))?;
    
    Ok(config)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[test]
    fn test_load_server_config() -> Result<()> {
        let mut temp_file = NamedTempFile::new()?;
        writeln!(temp_file, "host: 127.0.0.1")?;
        writeln!(temp_file, "port: 8080")?;
        
        let config: ServerConfig = load_config(temp_file.path())?;
        assert_eq!(config.host, "127.0.0.1");
        assert_eq!(config.port, 8080);
        
        Ok(())
    }
}
