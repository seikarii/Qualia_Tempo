//! # Responsibility
//! Detects musical combo patterns from player input sequences.
//!
//! ---
//!
//! Implements GDD.md combo system: detects harmonic (beneficial) and chaotic
//! (malicious) combos based on note sequences. Uses timeout windows to validate combos.

use anyhow::Result;
use std::collections::VecDeque;
use tracing::debug;

/// # Responsibility
/// Represents a detected combo result.
#[derive(Clone, Debug, PartialEq)]
pub enum ComboResult {
    /// No combo detected
    None,
    /// Harmonic combo (beneficial effect)
    Harmonic { keys: Vec<char>, name: String },
    /// Chaotic combo (malicious effect)
    Chaotic { keys: Vec<char>, name: String },
}

/// # Responsibility
/// Detects musical combo patterns from input sequences.
///
/// ---
///
/// Maintains a rolling window of recent inputs and matches against known
/// combo patterns from GDD.md. Implements timeout-based combo invalidation.
#[derive(Clone)]
pub struct MusicalComboDetectorService {
    /// Recent key presses (rolling window)
    input_buffer: VecDeque<(char, u64)>,
    /// Maximum time between inputs for combo (ms)
    combo_timeout_ms: u64,
    /// Maximum buffer size
    max_buffer_size: usize,
}

impl MusicalComboDetectorService {
    /// # Responsibility
    /// Creates detector with specified timeout window.
    ///
    /// ---
    ///
    /// Combo timeout determines max time between inputs for valid combo.
    /// Default is 1000ms (1 second) per GDD.md requirements.
    pub fn new(combo_timeout_ms: u64) -> Result<Self> {
        debug!("MusicalComboDetectorService initialized with timeout: {}ms", combo_timeout_ms);

        Ok(Self {
            input_buffer: VecDeque::with_capacity(10),
            combo_timeout_ms,
            max_buffer_size: 10,
        })
    }

    /// # Responsibility
    /// Adds input to buffer and checks for combo patterns.
    ///
    /// ---
    ///
    /// Returns ComboResult if pattern detected, None otherwise.
    /// Automatically prunes expired inputs based on timeout.
    pub fn add_input(&mut self, key: char, timestamp: u64) -> ComboResult {
        // Prune expired inputs
        self.prune_expired(timestamp);

        // Add new input
        self.input_buffer.push_back((key, timestamp));

        // Limit buffer size
        if self.input_buffer.len() > self.max_buffer_size {
            self.input_buffer.pop_front();
        }

        // Check for combos
        self.detect_combo()
    }

    /// # Responsibility
    /// Prunes inputs older than combo timeout.
    fn prune_expired(&mut self, current_timestamp: u64) {
        while let Some(&(_, timestamp)) = self.input_buffer.front() {
            if current_timestamp.saturating_sub(timestamp) > self.combo_timeout_ms {
                self.input_buffer.pop_front();
            } else {
                break;
            }
        }
    }

    /// # Responsibility
    /// Detects combo patterns in current buffer.
    ///
    /// ---
    ///
    /// Checks against known combos from GDD.md §3.7.
    /// Returns first detected combo (harmonic checked before chaotic).
    fn detect_combo(&mut self) -> ComboResult {
        let keys: Vec<char> = self.input_buffer.iter().map(|(k, _)| *k).collect();

        // Check harmonic combos (beneficial)
        if self.matches_sequence(&keys, &['Q', 'E', 'R']) {
            self.clear_buffer();
            return ComboResult::Harmonic {
                keys: vec!['Q', 'E', 'R'],
                name: "Remolino".to_string(),
            };
        }

        if self.matches_sequence(&keys, &['Q', 'R', 'F']) {
            self.clear_buffer();
            return ComboResult::Harmonic {
                keys: vec!['Q', 'R', 'F'],
                name: "Atractor".to_string(),
            };
        }

        if self.matches_sequence(&keys, &['T', 'E', 'R']) {
            self.clear_buffer();
            return ComboResult::Harmonic {
                keys: vec!['T', 'E', 'R'],
                name: "Repulsor".to_string(),
            };
        }

        if self.matches_sequence(&keys, &['Q', 'E', 'T']) {
            self.clear_buffer();
            return ComboResult::Harmonic {
                keys: vec!['Q', 'E', 'T'],
                name: "Multiplicador".to_string(),
            };
        }

        if self.matches_sequence(&keys, &['F', 'G', 'C']) {
            self.clear_buffer();
            return ComboResult::Harmonic {
                keys: vec!['F', 'G', 'C'],
                name: "Curación".to_string(),
            };
        }

        // Full scale combo (all 7 notes)
        if self.matches_sequence(&keys, &['Q', 'E', 'R', 'T', 'F', 'G', 'C']) {
            self.clear_buffer();
            return ComboResult::Harmonic {
                keys: vec!['Q', 'E', 'R', 'T', 'F', 'G', 'C'],
                name: "Escala Completa".to_string(),
            };
        }

        // Check chaotic combos (malicious)
        if self.matches_sequence(&keys, &['Q', 'T', 'G']) {
            self.clear_buffer();
            return ComboResult::Chaotic {
                keys: vec!['Q', 'T', 'G'],
                name: "Muro Sonoro".to_string(),
            };
        }

        if self.matches_sequence(&keys, &['E', 'F', 'C']) {
            self.clear_buffer();
            return ComboResult::Chaotic {
                keys: vec!['E', 'F', 'C'],
                name: "Zona de Daño".to_string(),
            };
        }

        if self.matches_sequence(&keys, &['R', 'G', 'T']) {
            self.clear_buffer();
            return ComboResult::Chaotic {
                keys: vec!['R', 'G', 'T'],
                name: "Repulsor Inverso".to_string(),
            };
        }

        if self.matches_sequence(&keys, &['Q', 'G', 'C']) {
            self.clear_buffer();
            return ComboResult::Chaotic {
                keys: vec!['Q', 'G', 'C'],
                name: "Atractor Hostil".to_string(),
            };
        }

        if self.matches_sequence(&keys, &['T', 'F', 'R']) {
            self.clear_buffer();
            return ComboResult::Chaotic {
                keys: vec!['T', 'F', 'R'],
                name: "Interferencia Auditiva".to_string(),
            };
        }

        ComboResult::None
    }

    /// # Responsibility
    /// Checks if buffer ends with given sequence.
    fn matches_sequence(&self, buffer: &[char], sequence: &[char]) -> bool {
        if buffer.len() < sequence.len() {
            return false;
        }

        let start = buffer.len() - sequence.len();
        &buffer[start..] == sequence
    }

    /// # Responsibility
    /// Clears input buffer after combo detection.
    fn clear_buffer(&mut self) {
        self.input_buffer.clear();
        debug!("Input buffer cleared after combo detection");
    }

    /// # Responsibility
    /// Returns current buffer size for debugging.
    pub fn buffer_size(&self) -> usize {
        self.input_buffer.len()
    }
}

impl Default for MusicalComboDetectorService {
    fn default() -> Self {
        Self::new(1000).expect("Default timeout should be valid")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use wasm_bindgen_test::*;

    wasm_bindgen_test_configure!(run_in_browser);

    #[wasm_bindgen_test]
    fn test_detector_creation() {
        let detector = MusicalComboDetectorService::new(1000);
        assert!(detector.is_ok());
    }

    #[wasm_bindgen_test]
    fn test_harmonic_combo_remolino() {
        let mut detector = MusicalComboDetectorService::new(1000).unwrap();

        let r1 = detector.add_input('Q', 0);
        assert_eq!(r1, ComboResult::None);

        let r2 = detector.add_input('E', 100);
        assert_eq!(r2, ComboResult::None);

        let r3 = detector.add_input('R', 200);
        assert_eq!(
            r3,
            ComboResult::Harmonic {
                keys: vec!['Q', 'E', 'R'],
                name: "Remolino".to_string()
            }
        );
    }

    #[wasm_bindgen_test]
    fn test_chaotic_combo_muro_sonoro() {
        let mut detector = MusicalComboDetectorService::new(1000).unwrap();

        detector.add_input('Q', 0);
        detector.add_input('T', 100);
        let result = detector.add_input('G', 200);

        assert_eq!(
            result,
            ComboResult::Chaotic {
                keys: vec!['Q', 'T', 'G'],
                name: "Muro Sonoro".to_string()
            }
        );
    }

    #[wasm_bindgen_test]
    fn test_combo_timeout() {
        let mut detector = MusicalComboDetectorService::new(500).unwrap();

        detector.add_input('Q', 0);
        detector.add_input('E', 100);
        
        // Wait beyond timeout
        let result = detector.add_input('R', 700);

        // Should not detect combo (Q expired)
        assert_eq!(result, ComboResult::None);
    }

    #[wasm_bindgen_test]
    fn test_full_scale_combo() {
        let mut detector = MusicalComboDetectorService::new(2000).unwrap();

        detector.add_input('Q', 0);
        detector.add_input('E', 100);
        detector.add_input('R', 200);
        detector.add_input('T', 300);
        detector.add_input('F', 400);
        detector.add_input('G', 500);
        let result = detector.add_input('C', 600);

        assert_eq!(
            result,
            ComboResult::Harmonic {
                keys: vec!['Q', 'E', 'R', 'T', 'F', 'G', 'C'],
                name: "Escala Completa".to_string()
            }
        );
    }

    #[wasm_bindgen_test]
    fn test_buffer_clearing() {
        let mut detector = MusicalComboDetectorService::new(1000).unwrap();

        detector.add_input('Q', 0);
        detector.add_input('E', 100);
        detector.add_input('R', 200); // Triggers Remolino

        // Buffer should be cleared
        assert_eq!(detector.buffer_size(), 0);

        // Next input should not trigger combo
        let result = detector.add_input('Q', 300);
        assert_eq!(result, ComboResult::None);
    }

    #[wasm_bindgen_test]
    fn test_no_combo_on_wrong_sequence() {
        let mut detector = MusicalComboDetectorService::new(1000).unwrap();

        detector.add_input('Q', 0);
        detector.add_input('Q', 100);
        let result = detector.add_input('Q', 200);

        assert_eq!(result, ComboResult::None);
    }

    #[wasm_bindgen_test]
    fn test_buffer_size_limit() {
        let mut detector = MusicalComboDetectorService::new(5000).unwrap();

        // Add 15 inputs (more than max_buffer_size of 10)
        for i in 0..15 {
            detector.add_input('A', i * 100);
        }

        // Buffer should be limited to 10
        assert_eq!(detector.buffer_size(), 10);
    }
}
