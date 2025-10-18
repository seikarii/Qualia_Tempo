//! # Responsibility
//! Analyzes musical timing accuracy of player inputs against beat map.
//!
//! ---
//!
//! Calculates accuracy scores for key presses based on timing deviation from
//! expected beat positions. Implements GDD.md timing windows for early/late detection.

use anyhow::Result;
use shared_core::contracts::combat_data::ComboActionType;
use shared_core::contracts::input::{
    InputAccuracy, MusicalInputAnalysis, PlayerAction, RecentInput, RhythmicPattern,
};
use tracing::debug;

/// # Responsibility
/// Timing windows for input accuracy calculation (in milliseconds).
///
/// ---
///
/// Based on GDD.md musical timing requirements. Perfect window is ±50ms,
/// Good is ±100ms, Okay is ±150ms, Miss beyond that.
#[derive(Clone, Copy, Debug)]
pub struct TimingWindows {
    pub perfect: f64,  // ±50ms
    pub good: f64,     // ±100ms
    pub okay: f64,     // ±150ms
}

impl Default for TimingWindows {
    fn default() -> Self {
        Self {
            perfect: 50.0,
            good: 100.0,
            okay: 150.0,
        }
    }
}

/// # Responsibility
/// Analyzes musical timing of player inputs.
///
/// ---
///
/// Compares input timestamps against expected beat positions to calculate
/// accuracy scores. Integrates with BeatMap data from song analysis.
#[derive(Clone)]
pub struct MusicalInputAnalyzerService {
    timing_windows: TimingWindows,
    bpm: f64,
    beat_duration_ms: f64,
}

impl MusicalInputAnalyzerService {
    /// # Responsibility
    /// Creates analyzer with specified BPM.
    ///
    /// ---
    ///
    /// BPM determines beat duration for timing calculations.
    pub fn new(bpm: f64) -> Result<Self> {
        if bpm <= 0.0 {
            return Err(anyhow::anyhow!("BPM must be positive"));
        }

        let beat_duration_ms = 60_000.0 / bpm;

        debug!("MusicalInputAnalyzerService initialized with BPM: {}", bpm);

        Ok(Self {
            timing_windows: TimingWindows::default(),
            bpm,
            beat_duration_ms,
        })
    }

    /// # Responsibility
    /// Updates BPM for dynamic tempo changes.
    pub fn set_bpm(&mut self, bpm: f64) {
        self.bpm = bpm;
        self.beat_duration_ms = 60_000.0 / bpm;
        debug!("BPM updated to {}", bpm);
    }

    /// # Responsibility
    /// Calculates accuracy score for a player action.
    ///
    /// ---
    ///
    /// Returns full musical analysis conforming to DATA.RUST.md schema.
    /// Uses timing windows to determine hit quality.
    pub fn analyze_input(&self, action: &PlayerAction, expected_timestamp: f64) -> MusicalInputAnalysis {
        let actual_timestamp = match action {
            PlayerAction::KeyPressed { timestamp, .. } => *timestamp,
            PlayerAction::DashInitiated { timestamp, .. } => *timestamp,
            _ => expected_timestamp, // Fallback for other action types
        };

        let deviation_ms = (actual_timestamp - expected_timestamp).abs();

        let accuracy_level = if deviation_ms <= self.timing_windows.perfect {
            InputAccuracy::Perfect
        } else if deviation_ms <= self.timing_windows.good {
            InputAccuracy::Good
        } else if deviation_ms <= self.timing_windows.okay {
            InputAccuracy::Ok
        } else {
            InputAccuracy::Miss
        };

        let action_type = match action {
            PlayerAction::KeyPressed { .. } => ComboActionType::Hit,
            PlayerAction::DashInitiated { .. } => ComboActionType::Dash,
            PlayerAction::ParryAttempted { .. } => ComboActionType::Parry,
            _ => ComboActionType::Hit,
        };

        debug!(
            "Input analyzed: deviation={}ms, accuracy={:?}",
            deviation_ms, accuracy_level
        );

        // Create analysis per DATA.RUST.md schema
        MusicalInputAnalysis {
            timestamp: actual_timestamp,
            recent_inputs: vec![RecentInput {
                action: action_type,
                timestamp: actual_timestamp,
                timing_offset: deviation_ms,
                accuracy: accuracy_level,
            }],
            rhythmic_consistency: 1.0, // Will be calculated from history
            detected_pattern: RhythmicPattern::None,
            harmonic_alignment: 0.5,
            phrase_completion: 0.0,
            dynamic_range: 0.5,
            suggested_qualia_shift: shared_core::contracts::QualiaState::default(),
        }
    }

    /// # Responsibility
    /// Calculates next expected beat timestamp.
    ///
    /// ---
    ///
    /// Uses BPM to predict when next beat should occur.
    pub fn get_next_beat_timestamp(&self, current_timestamp: f64) -> f64 {
        current_timestamp + self.beat_duration_ms
    }

    /// # Responsibility
    /// Checks if timestamp is close to a beat.
    ///
    /// ---
    ///
    /// Returns true if within "okay" timing window of a beat.
    pub fn is_on_beat(&self, timestamp: f64, beat_timestamp: f64) -> bool {
        let deviation = (timestamp - beat_timestamp).abs();
        deviation <= self.timing_windows.okay
    }
}

impl Default for MusicalInputAnalyzerService {
    fn default() -> Self {
        Self::new(120.0).expect("Default BPM should be valid")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use wasm_bindgen_test::*;

    wasm_bindgen_test_configure!(run_in_browser);

    #[wasm_bindgen_test]
    fn test_analyzer_creation() {
        let analyzer = MusicalInputAnalyzerService::new(120.0);
        assert!(analyzer.is_ok());
    }

    #[wasm_bindgen_test]
    fn test_invalid_bpm() {
        let analyzer = MusicalInputAnalyzerService::new(0.0);
        assert!(analyzer.is_err());
        
        let analyzer = MusicalInputAnalyzerService::new(-10.0);
        assert!(analyzer.is_err());
    }

    #[wasm_bindgen_test]
    fn test_perfect_timing() {
        let analyzer = MusicalInputAnalyzerService::new(120.0).unwrap();
        let action = PlayerAction::KeyPressed {
            key: 'Q',
            timestamp: 1000.0,
            accuracy: 0.0,
        };
        
        let analysis = analyzer.analyze_input(&action, 1000.0);
        
        assert_eq!(analysis.recent_inputs[0].accuracy, InputAccuracy::Perfect);
        assert_eq!(analysis.rhythmic_consistency, 1.0);
    }

    #[wasm_bindgen_test]
    fn test_early_timing() {
        let analyzer = MusicalInputAnalyzerService::new(120.0).unwrap();
        let action = PlayerAction::KeyPressed {
            key: 'Q',
            timestamp: 950.0, // 50ms early
            accuracy: 0.0,
        };
        
        let analysis = analyzer.analyze_input(&action, 1000.0);
        
        assert_eq!(analysis.recent_inputs[0].timing_offset, 50.0);
        assert_eq!(analysis.recent_inputs[0].accuracy, InputAccuracy::Perfect);
    }

    #[wasm_bindgen_test]
    fn test_late_timing() {
        let analyzer = MusicalInputAnalyzerService::new(120.0).unwrap();
        let action = PlayerAction::KeyPressed {
            key: 'Q',
            timestamp: 1080.0, // 80ms late
            accuracy: 0.0,
        };
        
        let analysis = analyzer.analyze_input(&action, 1000.0);
        
        assert_eq!(analysis.recent_inputs[0].timing_offset, 80.0);
        assert_eq!(analysis.recent_inputs[0].accuracy, InputAccuracy::Good);
    }

    #[wasm_bindgen_test]
    fn test_miss_timing() {
        let analyzer = MusicalInputAnalyzerService::new(120.0).unwrap();
        let action = PlayerAction::KeyPressed {
            key: 'Q',
            timestamp: 1200.0, // 200ms late (beyond okay window)
            accuracy: 0.0,
        };
        
        let analysis = analyzer.analyze_input(&action, 1000.0);
        
        assert_eq!(analysis.recent_inputs[0].accuracy, InputAccuracy::Miss);
    }

    #[wasm_bindgen_test]
    fn test_beat_duration_calculation() {
        let analyzer = MusicalInputAnalyzerService::new(120.0).unwrap();
        
        // At 120 BPM, beat duration should be 500ms
        assert!((analyzer.beat_duration_ms - 500.0).abs() < 0.01);
        
        let next_beat = analyzer.get_next_beat_timestamp(1000.0);
        assert_eq!(next_beat, 1500.0);
    }

    #[wasm_bindgen_test]
    fn test_is_on_beat() {
        let analyzer = MusicalInputAnalyzerService::new(120.0).unwrap();
        
        // Within okay window (±150ms)
        assert!(analyzer.is_on_beat(1000.0, 1000.0));
        assert!(analyzer.is_on_beat(1100.0, 1000.0));
        assert!(analyzer.is_on_beat(900.0, 1000.0));
        
        // Outside okay window
        assert!(!analyzer.is_on_beat(1200.0, 1000.0));
        assert!(!analyzer.is_on_beat(800.0, 1000.0));
    }

    #[wasm_bindgen_test]
    fn test_bpm_update() {
        let mut analyzer = MusicalInputAnalyzerService::new(120.0).unwrap();
        assert!((analyzer.beat_duration_ms - 500.0).abs() < 0.01);
        
        analyzer.set_bpm(180.0);
        
        // At 180 BPM, beat duration should be ~333.33ms
        assert!((analyzer.beat_duration_ms - 333.33).abs() < 0.1);
    }
}
