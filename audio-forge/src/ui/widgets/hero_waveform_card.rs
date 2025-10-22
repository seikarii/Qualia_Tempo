//! # Responsibility
//! Large hero waveform visualization with gradient overlay and auto-scroll.
//!
//! ---
//!
//! Modern music player focal point - displays waveform in full-width card
//! with animated playback position indicator.

use crate::ui::theme::QualiaTheme;
use egui::{self, Pos2, Rect, Stroke, Vec2};

/// # Responsibility
/// Hero waveform card component (300px height, full-width).
pub struct HeroWaveformCard {
    waveform_data: Vec<f32>,
    playback_position: f32, // 0.0 to 1.0
}

impl HeroWaveformCard {
    pub fn new() -> Self {
        Self {
            waveform_data: Vec::new(),
            playback_position: 0.0,
        }
    }
    
    pub fn update(&mut self, waveform: Vec<f32>, position: f32) {
        self.waveform_data = waveform;
        self.playback_position = position.clamp(0.0, 1.0);
    }
    
    pub fn render(&self, ui: &mut egui::Ui) {
        let card_height = 300.0;
        let available_width = ui.available_width();
        
        // Allocate space for card
        let (card_rect, _response) = ui.allocate_exact_size(
            Vec2::new(available_width, card_height),
            egui::Sense::hover(),
        );
        
        // Draw gradient background
        QualiaTheme::fake_gradient_vertical(
            ui,
            card_rect,
            QualiaTheme::BG_PANEL,
            QualiaTheme::BG_DARK,
            20, // 20 steps for smooth gradient
        );
        
        // Draw waveform
        if !self.waveform_data.is_empty() {
            self.draw_waveform(ui, card_rect);
        } else {
            // Placeholder text
            ui.painter().text(
                card_rect.center(),
                egui::Align2::CENTER_CENTER,
                "No waveform data - load audio file",
                egui::FontId::proportional(18.0),
                QualiaTheme::TEXT_SECONDARY,
            );
        }
        
        // Draw playback position indicator
        if self.playback_position > 0.0 {
            let x = card_rect.left() + card_rect.width() * self.playback_position;
            ui.painter().vline(
                x,
                card_rect.y_range(),
                Stroke::new(2.0, QualiaTheme::LIME_GREEN),
            );
        }
    }
    
    fn draw_waveform(&self, ui: &mut egui::Ui, rect: Rect) {
        let painter = ui.painter();
        let center_y = rect.center().y;
        let amplitude_scale = rect.height() * 0.4; // 40% of card height
        
        let samples_per_pixel = (self.waveform_data.len() as f32 / rect.width()).max(1.0);
        let num_pixels = rect.width() as usize;
        
        let mut points: Vec<Pos2> = Vec::with_capacity(num_pixels * 2);
        
        for px in 0..num_pixels {
            let sample_idx = ((px as f32 * samples_per_pixel) as usize).min(self.waveform_data.len() - 1);
            let amplitude = self.waveform_data.get(sample_idx).copied().unwrap_or(0.0);
            
            let x = rect.left() + px as f32;
            let y = center_y - (amplitude * amplitude_scale);
            
            points.push(Pos2::new(x, y));
        }
        
        // Draw waveform as connected lines
        painter.add(egui::Shape::line(
            points,
            Stroke::new(1.5, QualiaTheme::NEON_BLUE),
        ));
    }
}

impl Default for HeroWaveformCard {
    fn default() -> Self {
        Self::new()
    }
}
