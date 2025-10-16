//! # Responsibility
//! Configuration for the metronome service.

use serde::{Deserialize, Serialize};

/// # Responsibility
/// Configuration for metronome timing and musical parameters.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetronomeConfig {
    /// Beats per minute
    pub bpm: f64,
    
    /// Time signature numerator (beats per measure)
    pub time_signature_numerator: u32,
    
    /// Time signature denominator (note value for each beat)
    pub time_signature_denominator: u32,
}

impl Default for MetronomeConfig {
    fn default() -> Self {
        Self {
            bpm: 120.0,
            time_signature_numerator: 4,
            time_signature_denominator: 4,
        }
    }
}
