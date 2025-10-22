//! # Responsibility
//! Multi-band spectrum visualizer with 6-12 animated vertical bars.
//!
//! ---
//!
//! Modern equalizer-style visualization with smooth height interpolation.

use crate::ui::theme::QualiaTheme;
use egui::{self, Rect, Vec2};

/// # Responsibility
/// Multi-band spectrum grid component with smooth animation.
pub struct MultiBandSpectrumGrid {
    band_heights: Vec<f32>,      // Current heights (0.0 to 1.0)
    target_heights: Vec<f32>,    // Target heights (for smooth animation)
    num_bands: usize,
}

impl MultiBandSpectrumGrid {
    pub fn new(num_bands: usize) -> Self {
        Self {
            band_heights: vec![0.0; num_bands],
            target_heights: vec![0.0; num_bands],
            num_bands,
        }
    }
    
    pub fn update(&mut self, spectrum_magnitudes: &[f32]) {
        if spectrum_magnitudes.is_empty() {
            return;
        }
        
        // Downsample spectrum to num_bands
        let step = spectrum_magnitudes.len().max(self.num_bands) / self.num_bands;
        for i in 0..self.num_bands {
            let start = i * step;
            let end = ((i + 1) * step).min(spectrum_magnitudes.len());
            
            if start < spectrum_magnitudes.len() {
                let avg = spectrum_magnitudes[start..end]
                    .iter()
                    .sum::<f32>() / (end - start).max(1) as f32;
                
                self.target_heights[i] = avg.clamp(0.0, 1.0);
            }
        }
    }
    
    pub fn render(&mut self, ui: &mut egui::Ui) {
        // Smooth interpolation (lerp toward target)
        for i in 0..self.num_bands {
            self.band_heights[i] += (self.target_heights[i] - self.band_heights[i]) * 0.3;
        }
        
        let available_width = ui.available_width();
        let bar_width = (available_width / self.num_bands as f32) - 8.0;
        let max_height = 150.0;
        
        ui.horizontal(|ui| {
            ui.spacing_mut().item_spacing.x = 8.0;
            
            for &height in &self.band_heights {
                let bar_height = height * max_height;
                let (rect, _) = ui.allocate_exact_size(
                    Vec2::new(bar_width, max_height),
                    egui::Sense::hover(),
                );
                
                // Draw bar from bottom up
                let bar_rect = Rect::from_min_size(
                    egui::pos2(rect.min.x, rect.max.y - bar_height),
                    Vec2::new(bar_width, bar_height),
                );
                
                // Gradient fill (simulated with 5 steps)
                if bar_height > 0.0 {
                    QualiaTheme::fake_gradient_vertical(
                        ui, 
                        bar_rect, 
                        QualiaTheme::GRADIENT_ACCENT_END,
                        QualiaTheme::GRADIENT_ACCENT_START,
                        5
                    );
                }
                
                // Border
                ui.painter().rect_stroke(
                    bar_rect,
                    4.0,
                    egui::Stroke::new(1.0, QualiaTheme::BORDER_FOCUS),
                    egui::epaint::StrokeKind::Outside,
                );
            }
        });
    }
}

impl Default for MultiBandSpectrumGrid {
    fn default() -> Self {
        Self::new(8)
    }
}
