//! # Responsibility
//! Combat orchestrator service configuration.

use serde::{Deserialize, Serialize};

/// # Responsibility
/// Configuration for combat orchestration and flow control.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CombatOrchestratorConfig {
    /// Combat tick rate in Hz (updates per second)
    pub tick_rate_hz: u32,
    
    /// Enable debug logging
    pub debug_mode: bool,
}

impl Default for CombatOrchestratorConfig {
    fn default() -> Self {
        Self {
            tick_rate_hz: 60,
            debug_mode: false,
        }
    }
}
