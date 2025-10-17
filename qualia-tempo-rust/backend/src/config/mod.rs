//! # Responsibility
//! Configuration structures and loading logic.

pub mod server;
pub mod game_logic;

pub use server::ServerConfig;
pub use game_logic::GameLogicConfig;

use anyhow::{Context, Result};
use std::path::Path;

/// # Responsibility
/// Load configuration from YAML file.
///
/// ---
///
/// Generic configuration loader using serde_yaml. All config structs
/// must implement Deserialize.
pub fn load_config<T>(path: impl AsRef<Path>) -> Result<T>
where
    T: serde::de::DeserializeOwned,
{
    let path = path.as_ref();
    let contents = std::fs::read_to_string(path)
        .context(format!("Failed to read config file: {}", path.display()))?;
    
    let config: T = serde_yaml::from_str(&contents)
        .context(format!("Failed to parse YAML config: {}", path.display()))?;
    
    Ok(config)
}
