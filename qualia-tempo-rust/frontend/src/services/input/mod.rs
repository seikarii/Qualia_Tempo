//! # Responsibility
//! Input services module providing keyboard, mouse, and combo detection.
//!
//! ---
//!
//! Implements the complete input pipeline:
//! - InputController: Raw input capture
//! - MusicalInputAnalyzer: Timing accuracy calculation
//! - MusicalComboDetector: Combo pattern recognition

pub mod input_controller;
pub mod musical_combo_detector;
pub mod musical_input_analyzer;

pub use input_controller::InputControllerService;
pub use musical_combo_detector::{ComboResult, MusicalComboDetectorService};
pub use musical_input_analyzer::{MusicalInputAnalyzerService, TimingWindows};
