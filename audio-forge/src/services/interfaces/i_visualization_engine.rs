//! # Responsibility
//! Trait definition for egui-based audio visualization rendering.

use crate::contracts::frequency_spectrum::FrequencySpectrum;
use egui::{Response, Ui};
use shaku::Interface;

/// # Responsibility
/// Renders waveform and spectrum widgets in egui.
pub trait IVisualizationEngine: Interface {
    /// # Responsibility
    /// Renders time-domain waveform as line plot.
    ///
    /// ---
    ///
    /// Takes audio samples and renders them as a continuous line in egui.
    /// Samples should be normalized to [-1.0, 1.0] range.
    fn render_waveform(&self, ui: &mut Ui, samples: &[f32]) -> Response;

    /// # Responsibility
    /// Renders frequency-domain spectrum as bar chart.
    ///
    /// ---
    ///
    /// Takes FFT spectrum data and renders frequency bins as vertical bars.
    /// Bars are color-coded by frequency range for visual distinction.
    fn render_spectrum(&self, ui: &mut Ui, spectrum: &FrequencySpectrum) -> Response;

    /// # Responsibility
    /// Renders instrument detection overlay as color-coded intensity bars.
    ///
    /// ---
    ///
    /// Displays bass (red), mid (green), and treble (blue) levels as
    /// horizontal bars. All values must be in [0.0, 1.0] range.
    fn render_instrument_map(&self, ui: &mut Ui, bass: f32, mid: f32, treble: f32) -> Response;
}
