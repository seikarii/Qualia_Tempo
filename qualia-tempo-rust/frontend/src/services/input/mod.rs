//! # Responsibility
//! Input services module - keyboard capture and rhythm validation.

pub mod keyboard_controller;
pub mod rhythm_validator;

pub use keyboard_controller::{KeyboardControllerService, KeyboardConfig, GameKey};
pub use rhythm_validator::{RhythmValidatorService, RhythmValidationConfig, TimingAccuracy};
