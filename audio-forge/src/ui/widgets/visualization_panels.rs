//! # Responsibility
//! Visualization panels for waveform and frequency spectrum display.
//!
//! ---
//!
//! Extracted from MainWindow (Directive 13). This module provides:
//! - WaveformPanel: Time-domain waveform visualization
//! - SpectrumPanel: Frequency-domain spectrum + instrument detection

use crate::contracts::frequency_spectrum::FrequencySpectrum;
use crate::services::interfaces::i_visualization_engine::IVisualizationEngine;
use crate::ui::widgets::Panel;
use egui;
use std::sync::Arc;

/// # Responsibility
/// Waveform visualization panel (time domain).
///
/// ---
///
/// Displays real-time audio waveform from cached data.
pub struct WaveformPanel {
    /// Visualization engine service (injected dependency)
    visualization_engine: Arc<dyn IVisualizationEngine>,
    
    /// Cached waveform data (passed from parent on render)
    cached_waveform: Vec<f32>,
}

impl WaveformPanel {
    /// # Responsibility
    /// Create new WaveformPanel with injected visualization engine.
    pub fn new(visualization_engine: Arc<dyn IVisualizationEngine>) -> Self {
        Self {
            visualization_engine,
            cached_waveform: Vec::new(),
        }
    }
    
    /// # Responsibility
    /// Update cached waveform data.
    ///
    /// ---
    ///
    /// Called by parent before render() to provide latest data.
    pub fn update_waveform(&mut self, waveform: Vec<f32>) {
        self.cached_waveform = waveform;
    }
}

impl Panel for WaveformPanel {
    /// # Responsibility
    /// Render waveform visualization.
    ///
    /// ---
    ///
    /// ## Returns
    /// `false` (no config changes)
    fn render(&mut self, _ctx: &egui::Context, ui: &mut egui::Ui) -> bool {
        ui.heading("Waveform (Time Domain)");
        
        if self.cached_waveform.is_empty() {
            ui.label("🎵 Load an audio file to see waveform");
        } else {
            self.visualization_engine
                .render_waveform(ui, &self.cached_waveform);
        }
        
        false
    }
}

/// # Responsibility
/// Spectrum and instrument detection panel (frequency domain).
///
/// ---
///
/// Displays:
/// - Frequency spectrum visualization
/// - Instrument level detection (bass, mid, treble)
pub struct SpectrumPanel {
    /// Visualization engine service (injected dependency)
    visualization_engine: Arc<dyn IVisualizationEngine>,
    
    /// Cached spectrum data (passed from parent on render)
    cached_spectrum: FrequencySpectrum,
    
    /// Cached instrument levels (bass, mid, treble)
    cached_instrument_levels: (f32, f32, f32),
}

impl SpectrumPanel {
    /// # Responsibility
    /// Create new SpectrumPanel with injected visualization engine.
    pub fn new(visualization_engine: Arc<dyn IVisualizationEngine>) -> Self {
        Self {
            visualization_engine,
            cached_spectrum: FrequencySpectrum {
                frequencies: Vec::new(),
                magnitudes: Vec::new(),
                sample_rate: 44100,
                window_size: 2048,
            },
            cached_instrument_levels: (0.0, 0.0, 0.0),
        }
    }
    
    /// # Responsibility
    /// Update cached spectrum and instrument data.
    ///
    /// ---
    ///
    /// Called by parent before render() to provide latest data.
    pub fn update_data(
        &mut self,
        spectrum: FrequencySpectrum,
        instrument_levels: (f32, f32, f32),
    ) {
        self.cached_spectrum = spectrum;
        self.cached_instrument_levels = instrument_levels;
    }
}

impl Panel for SpectrumPanel {
    /// # Responsibility
    /// Render spectrum and instrument detection UI.
    ///
    /// ---
    ///
    /// ## Returns
    /// `false` (no config changes)
    fn render(&mut self, _ctx: &egui::Context, ui: &mut egui::Ui) -> bool {
        ui.heading("Frequency Spectrum");
        
        if self.cached_spectrum.frequencies.is_empty() {
            ui.label("🎵 Load an audio file to see spectrum");
        } else {
            self.visualization_engine
                .render_spectrum(ui, &self.cached_spectrum);
        }

        ui.separator();

        ui.heading("Instrument Detection");
        
        if self.cached_spectrum.frequencies.is_empty() {
            ui.label("🎵 Load an audio file to see instrument levels");
        } else {
            let (bass, mid, treble) = self.cached_instrument_levels;
            self.visualization_engine
                .render_instrument_map(ui, bass, mid, treble);
        }
        
        false
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::visualization_engine::VisualizationEngineService;
    
    #[test]
    fn test_waveform_panel_creates_with_empty_data() {
        let engine = Arc::new(VisualizationEngineService::default());
        let panel = WaveformPanel::new(engine);
        
        assert!(panel.cached_waveform.is_empty());
    }
    
    #[test]
    fn test_waveform_panel_updates_data() {
        let engine = Arc::new(VisualizationEngineService::default());
        let mut panel = WaveformPanel::new(engine);
        
        let test_data = vec![0.1, 0.2, 0.3];
        panel.update_waveform(test_data.clone());
        
        assert_eq!(panel.cached_waveform.len(), 3);
        assert_eq!(panel.cached_waveform[0], 0.1);
    }
    
    #[test]
    fn test_spectrum_panel_creates_with_default_spectrum() {
        let engine = Arc::new(VisualizationEngineService::default());
        let panel = SpectrumPanel::new(engine);
        
        assert!(panel.cached_spectrum.frequencies.is_empty());
        assert_eq!(panel.cached_instrument_levels, (0.0, 0.0, 0.0));
    }
    
    #[test]
    fn test_spectrum_panel_updates_data() {
        let engine = Arc::new(VisualizationEngineService::default());
        let mut panel = SpectrumPanel::new(engine);
        
        let test_spectrum = FrequencySpectrum {
            frequencies: vec![100.0, 200.0],
            magnitudes: vec![0.5, 0.7],
            sample_rate: 48000,
            window_size: 1024,
        };
        
        panel.update_data(test_spectrum, (0.3, 0.4, 0.5));
        
        assert_eq!(panel.cached_spectrum.frequencies.len(), 2);
        assert_eq!(panel.cached_spectrum.sample_rate, 48000);
        assert_eq!(panel.cached_instrument_levels, (0.3, 0.4, 0.5));
    }
}
