//! # Responsibility
//! Shaku Provider for AppConfig dependency injection.
//!
//! ---
//!
//! **ARCHITECTURAL MANDATE**: Configuration is loaded ONCE at startup and injected
//! as immutable Arc<AppConfig> into all services. This eliminates post-construction
//! config injection (QUALIA.CODE.RUST Section 2.2).

use super::app_config::AppConfig;
use super::persistence::load_config;
use crate::services::AudioForgeModule;
use shaku::Provider;
use std::error::Error;
use tracing::warn;

/// # Responsibility
/// Shaku Provider that loads AppConfig from disk or defaults.
///
/// ---
///
/// Called once during DI container build. All services receive the same Arc<AppConfig>.
#[derive(Default)]
pub struct AppConfigProvider;

impl Provider<AudioForgeModule> for AppConfigProvider {
    type Interface = AppConfig;

    fn provide(_module: &AudioForgeModule) -> Result<Box<Self::Interface>, Box<dyn Error>> {
        let config = match load_config() {
            Ok(cfg) => {
                tracing::info!("✅ Configuration loaded successfully via Shaku provider");
                cfg
            }
            Err(e) => {
                warn!("⚠️ Failed to load config, using defaults: {}", e);
                AppConfig::default()
            }
        };
        
        Ok(Box::new(config))
    }
}
