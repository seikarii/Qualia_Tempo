//! # Responsibility
//! High-fidelity mock for IVisualizationEngine trait.
//!
//! ---
//!
//! Enables testing of UI rendering logic without egui runtime.

use crate::contracts::frequency_spectrum::FrequencySpectrum;
use crate::services::interfaces::i_visualization_engine::IVisualizationEngine;
use egui::{Response, Ui};
use mockall::mock;

mock! {
    /// # Responsibility
    /// Mock implementation of IVisualizationEngine for unit testing.
    ///
    /// ---
    ///
    /// **NOTE**: egui::Response and Ui cannot be easily mocked due to lifetime constraints.
    /// For full UI testing, use egui's `TestApp` harness instead.
    ///
    /// This mock is primarily for verifying that visualization methods are CALLED,
    /// not for validating rendering output.
    pub VisualizationEngine {}

    impl IVisualizationEngine for VisualizationEngine {
        fn render_waveform(&self, ui: &mut Ui, samples: &[f32]) -> Response;
        fn render_spectrum(&self, ui: &mut Ui, spectrum: &FrequencySpectrum) -> Response;
        fn render_instrument_map(&self, ui: &mut Ui, bass: f32, mid: f32, treble: f32) -> Response;
    }
}

// NOTE: Shaku automatically implements Interface for all T: Any + Send + Sync

// NOTE: Tests for this mock are limited due to egui::Ui lifetime constraints.
// Real visualization testing should use integration tests with egui::TestApp.
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mock_visualization_engine_compiles() {
        // This test verifies that the mock compiles correctly.
        // Actual usage testing requires egui runtime context.
        let _mock = MockVisualizationEngine::new();
    }
}
