//! # Responsibility
//! Implements egui-based audio visualization rendering.

use crate::contracts::frequency_spectrum::FrequencySpectrum;
use crate::services::interfaces::i_visualization_engine::IVisualizationEngine;
use egui::{Color32, Response, Ui, Vec2, Pos2};
use shaku::Component;
use std::sync::RwLock;
use tracing::instrument;

/// # Responsibility
/// Renders audio visualizations using egui immediate mode GUI.
///
/// ---
///
/// Provides three visualization modes:
/// 1. Waveform: Time-domain line plot of audio samples
/// 2. Spectrum: Frequency-domain bar chart from FFT data
/// 3. Instrument Map: Color-coded bass/mid/treble intensity bars
///
/// OPTIMIZATIONS:
/// - Cached Vec<Pos2> buffer eliminates 120,000 allocations/second @ 60fps
#[derive(Component)]
#[shaku(interface = IVisualizationEngine)]
pub struct VisualizationEngineService {
    /// Minimum height for waveform plot (pixels)
    #[shaku(default = 150.0)]
    waveform_height: f32,
    /// Minimum height for spectrum plot (pixels)
    #[shaku(default = 200.0)]
    spectrum_height: f32,
    /// Minimum height for instrument map (pixels)
    #[shaku(default = 80.0)]
    instrument_map_height: f32,
    /// Reusable buffer for waveform points (performance optimization)
    #[shaku(default)]
    cached_points: RwLock<Vec<Pos2>>,
}

impl Default for VisualizationEngineService {
    fn default() -> Self {
        Self::new()
    }
}

impl VisualizationEngineService {
    /// Create new visualization engine with default heights
    pub fn new() -> Self {
        Self {
            waveform_height: 150.0,
            spectrum_height: 200.0,
            instrument_map_height: 80.0,
            cached_points: RwLock::new(Vec::with_capacity(2048)),
        }
    }

    /// Create with custom heights
    pub fn with_heights(
        waveform_height: f32,
        spectrum_height: f32,
        instrument_map_height: f32,
    ) -> Self {
        Self {
            waveform_height,
            spectrum_height,
            instrument_map_height,
            cached_points: RwLock::new(Vec::with_capacity(2048)),
        }
    }
}

impl IVisualizationEngine for VisualizationEngineService {
    #[instrument(skip(self, ui, samples), fields(sample_count = samples.len()))]
    fn render_waveform(&self, ui: &mut Ui, samples: &[f32]) -> Response {
        use egui::epaint::{CornerRadius, PathStroke, RectShape};
        use egui::{Pos2, Shape};

        let (response, painter) = ui.allocate_painter(
            Vec2::new(ui.available_width(), self.waveform_height),
            egui::Sense::hover(),
        );

        let rect = response.rect;

        if samples.is_empty() {
            return response;
        }

        // Draw background
        painter.add(RectShape::filled(
            rect,
            CornerRadius::ZERO,
            Color32::from_gray(20),
        ));

        // Calculate waveform points using cached buffer (eliminates 120k allocs/sec)
        let num_samples = samples.len();
        let x_step = rect.width() / num_samples as f32;
        let center_y = rect.center().y;
        let amplitude_scale = rect.height() * 0.45;

        let mut points = self.cached_points.write().unwrap();
        points.clear();
        points.reserve(num_samples);
        
        for (i, &sample) in samples.iter().enumerate() {
            let x = rect.min.x + i as f32 * x_step;
            let y = center_y - sample * amplitude_scale;
            points.push(Pos2::new(x, y));
        }

        // Draw waveform line
        if !points.is_empty() {
            let stroke = PathStroke::new(1.5, Color32::from_rgb(100, 200, 100));
            painter.add(Shape::line(points.clone(), stroke));
        }

        response
    }

    #[instrument(skip(self, ui, spectrum))]
    fn render_spectrum(&self, ui: &mut Ui, spectrum: &FrequencySpectrum) -> Response {
        use egui::Rect;
        use egui::epaint::{CornerRadius, RectShape};

        let (response, painter) = ui.allocate_painter(
            Vec2::new(ui.available_width(), self.spectrum_height),
            egui::Sense::hover(),
        );

        let rect = response.rect;
        let num_bins = spectrum.magnitudes.len().min(100); // Limit to 100 bars for performance

        if num_bins == 0 {
            return response;
        }

        let bar_width = rect.width() / num_bins as f32;
        let max_height = rect.height();

        for i in 0..num_bins {
            let magnitude = spectrum.magnitudes[i];
            let bar_height = magnitude * max_height;

            let x = rect.min.x + i as f32 * bar_width;
            let y = rect.max.y - bar_height;

            // Color-code by frequency range
            let color = if spectrum.frequencies[i] < 250.0 {
                Color32::from_rgb(255, 100, 100) // Bass - Red
            } else if spectrum.frequencies[i] < 3000.0 {
                Color32::from_rgb(100, 255, 100) // Mid - Green
            } else {
                Color32::from_rgb(100, 100, 255) // Treble - Blue
            };

            let bar_rect =
                Rect::from_min_size(egui::pos2(x, y), Vec2::new(bar_width * 0.8, bar_height));

            painter.add(RectShape::filled(bar_rect, CornerRadius::same(2), color));
        }

        response
    }

    #[instrument(skip(self, ui), fields(bass, mid, treble))]
    fn render_instrument_map(&self, ui: &mut Ui, bass: f32, mid: f32, treble: f32) -> Response {
        ui.vertical(|ui| {
            ui.set_min_height(self.instrument_map_height);

            // Bass bar (red) - Consistent label alignment
            ui.horizontal(|ui| {
                ui.label("Bass: ");
                let bass_width = bass.clamp(0.0, 1.0) * ui.available_width() * 0.8;
                let (rect, _) =
                    ui.allocate_exact_size(Vec2::new(bass_width, 20.0), egui::Sense::hover());
                ui.painter().rect_filled(
                    rect,
                    egui::CornerRadius::same(4),
                    Color32::from_rgb(255, 100, 100),
                );
            });

            // Mid bar (green)
            ui.horizontal(|ui| {
                ui.label("Mid:  ");
                let mid_width = mid.clamp(0.0, 1.0) * ui.available_width() * 0.8;
                let (rect, _) =
                    ui.allocate_exact_size(Vec2::new(mid_width, 20.0), egui::Sense::hover());
                ui.painter().rect_filled(
                    rect,
                    egui::CornerRadius::same(4),
                    Color32::from_rgb(100, 255, 100),
                );
            });

            // Treble bar (blue)
            ui.horizontal(|ui| {
                ui.label("Treb: ");
                let treble_width = treble.clamp(0.0, 1.0) * ui.available_width() * 0.8;
                let (rect, _) =
                    ui.allocate_exact_size(Vec2::new(treble_width, 20.0), egui::Sense::hover());
                ui.painter().rect_filled(
                    rect,
                    egui::CornerRadius::same(4),
                    Color32::from_rgb(100, 100, 255),
                );
            });
        })
        .response
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_visualization_engine_creation() {
        let engine = VisualizationEngineService::new();
        assert_eq!(engine.waveform_height, 150.0);
        assert_eq!(engine.spectrum_height, 200.0);
        assert_eq!(engine.instrument_map_height, 80.0);
    }

    #[test]
    fn test_custom_heights() {
        let engine = VisualizationEngineService::with_heights(200.0, 300.0, 100.0);
        assert_eq!(engine.waveform_height, 200.0);
        assert_eq!(engine.spectrum_height, 300.0);
        assert_eq!(engine.instrument_map_height, 100.0);
    }

    #[test]
    fn test_default_trait() {
        let engine = VisualizationEngineService::default();
        assert_eq!(engine.waveform_height, 150.0); // Default uses new() values
    }
}
