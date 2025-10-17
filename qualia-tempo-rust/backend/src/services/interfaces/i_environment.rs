//! # Responsibility
//! Environment service interface for system information.

use shaku::Interface;

/// # Responsibility
/// Runtime environment type.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Environment {
    Development,
    Staging,
    Production,
}

/// # Responsibility
/// Provides system and environment information.
pub trait IEnvironmentService: Interface {
    /// Returns current environment (dev/staging/prod).
    fn get_environment(&self) -> Environment;
    
    /// Returns OS name.
    fn get_os(&self) -> &str;
    
    /// Returns architecture (x86_64, aarch64, etc).
    fn get_arch(&self) -> &str;
    
    /// Returns CPU count.
    fn get_cpu_count(&self) -> usize;
    
    /// Returns config directory path.
    fn get_config_dir(&self) -> &str;
}
