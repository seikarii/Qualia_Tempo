//! # Responsibility
//! PatternSystemConfig structure for attack pattern system configuration.
//!
//! ---
//!
//! Loaded from config/pattern_system.yaml at startup.

use serde::{Deserialize, Serialize};

/// # Responsibility
/// Configuration for PatternSystemService pattern loading and execution.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PatternSystemConfig {
    pub pattern_data_directory: String, // e.g., "combat_data/"
    pub enable_pattern_caching: bool,
    pub max_cached_patterns: usize,
    pub timing_tolerance_ms: f64, // Tolerance for beat timing validation
}

impl Default for PatternSystemConfig {
    fn default() -> Self {
        Self {
            pattern_data_directory: "combat_data/".to_string(),
            enable_pattern_caching: true,
            max_cached_patterns: 50,
            timing_tolerance_ms: 50.0,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_pattern_config() {
        let config = PatternSystemConfig::default();
        assert_eq!(config.pattern_data_directory, "combat_data/");
        assert!(config.enable_pattern_caching);
    }
}
