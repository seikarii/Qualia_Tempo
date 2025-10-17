//! # Responsibility
//! Implements environment service for runtime environment detection.
//!
//! ---
//!
//! Provides environment detection (dev/staging/prod), OS/architecture info,
//! CPU count, and config directory resolution.

use crate::services::interfaces::{IEnvironmentService, Environment};
use shaku::{Component, Interface};
use std::env;
use tracing::info;

/// # Responsibility
/// Implements IEnvironmentService with runtime environment detection.
#[derive(Component)]
#[shaku(interface = IEnvironmentService)]
pub struct EnvironmentService {
    environment: Environment,
    config_dir: String,
}

impl EnvironmentService {
    /// # Responsibility
    /// Creates new EnvironmentService by detecting current environment.
    pub fn new() -> Self {
        let environment = Self::detect_environment();
        let config_dir = Self::resolve_config_dir();
        
        info!(
            "EnvironmentService initialized: {:?}, config_dir={}",
            environment, config_dir
        );
        
        Self {
            environment,
            config_dir,
        }
    }
    
    /// # Responsibility
    /// Detects environment from ENV var or defaults to Development.
    fn detect_environment() -> Environment {
        match env::var("ENVIRONMENT")
            .or_else(|_| env::var("ENV"))
            .as_deref()
        {
            Ok("production") | Ok("prod") => Environment::Production,
            Ok("staging") | Ok("stage") => Environment::Staging,
            _ => Environment::Development,
        }
    }
    
    /// # Responsibility
    /// Resolves config directory (XDG_CONFIG_HOME or ~/.config).
    fn resolve_config_dir() -> String {
        env::var("XDG_CONFIG_HOME")
            .or_else(|_| {
                env::var("HOME").map(|home| format!("{}/.config", home))
            })
            .unwrap_or_else(|_| ".config".to_string())
    }
}

impl IEnvironmentService for EnvironmentService {
    fn get_environment(&self) -> Environment {
        self.environment
    }
    
    fn get_os(&self) -> &str {
        env::consts::OS
    }
    
    fn get_arch(&self) -> &str {
        env::consts::ARCH
    }
    
    fn get_cpu_count(&self) -> usize {
        num_cpus::get()
    }
    
    fn get_config_dir(&self) -> &str {
        &self.config_dir
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_get_environment_from_env_var() {
        env::set_var("ENVIRONMENT", "production");
        let service = EnvironmentService::new();
        assert_eq!(service.get_environment(), Environment::Production);
        env::remove_var("ENVIRONMENT");
    }
    
    #[test]
    fn test_get_environment_default_dev() {
        env::remove_var("ENVIRONMENT");
        env::remove_var("ENV");
        let service = EnvironmentService::new();
        assert_eq!(service.get_environment(), Environment::Development);
    }
    
    #[test]
    fn test_get_os_returns_current() {
        let service = EnvironmentService::new();
        let os = service.get_os();
        assert!(!os.is_empty(), "OS should not be empty");
    }
    
    #[test]
    fn test_get_arch_returns_current() {
        let service = EnvironmentService::new();
        let arch = service.get_arch();
        assert!(!arch.is_empty(), "Architecture should not be empty");
    }
    
    #[test]
    fn test_get_cpu_count_positive() {
        let service = EnvironmentService::new();
        let cpu_count = service.get_cpu_count();
        assert!(cpu_count > 0, "CPU count should be positive");
    }
    
    #[test]
    fn test_get_config_dir_valid_path() {
        let service = EnvironmentService::new();
        let config_dir = service.get_config_dir();
        assert!(!config_dir.is_empty(), "Config dir should not be empty");
    }
}
