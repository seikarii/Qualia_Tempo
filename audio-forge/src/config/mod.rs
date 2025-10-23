//! # Responsibility
//! Configuration management module exports.

pub mod app_config;
pub mod persistence;
pub mod provider;

pub use app_config::{AppConfig, AudioConfig, VisualizationConfig};
pub use persistence::{load_config, save_config};
pub use provider::AppConfigProvider;
