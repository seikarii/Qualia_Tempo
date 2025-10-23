//! # Responsibility
//! Large hero waveform visualization with gradient overlay and interactive seekbar.
//!
//! ---
//!
//! Modern music player focal point - displays waveform in full-width card
//! with animated playback position indicator and full-width seekbar for navigation.
//!
//! ## PRODUCTION FEATURES
//! - Full-width interactive seekbar (Spotify-style)
//! - Click-to-seek anywhere on waveform
//! - Drag handle for precise seeking
//! - Visual feedback on hover
//! - Synchronized green bar + seekbar handle

use crate::events::AudioForgeEvent;
use crate::services::event_bus::IEventBus;
use crate::ui::theme::QualiaTheme;
use egui::{self, Pos2, Rect, Stroke, Vec2, Color32, Sense};
use std::sync::Arc;
use std::time::Duration;

/// # Responsibility
/// Hero waveform card component with full-width interactive seekbar (300px height).
pub struct HeroWaveformCard {
    waveform_data: Vec<f32>,
    playback_position: f32, // 0.0 to 1.0
    total_duration: Duration,
    event_bus: Option<Arc<dyn IEventBus>>,
}

impl HeroWaveformCard {
    pub fn new() -> Self {
        Self {
            waveform_data: Vec::new(),
            playback_position: 0.0,
            total_duration: Duration::ZERO,
            event_bus: None,
        }
    }
    
    /// # Responsibility
    /// Initialize with EventBus for seek event emission.
    pub fn with_event_bus(mut self, event_bus: Arc<dyn IEventBus>) -> Self {
        self.event_bus = Some(event_bus);
        self
    }
    
    /// # Responsibility
    /// Update waveform data and playback position.
    pub fn update(&mut self, waveform: Vec<f32>, position: f32) {
        self.waveform_data = waveform;
        self.playback_position = position.clamp(0.0, 1.0);
    }
    
    /// # Responsibility
    /// Update total duration for seek calculations.
    pub fn set_duration(&mut self, duration: Duration) {
        self.total_duration = duration;
    }
    
    /// # Responsibility
    /// Render waveform card with interactive full-width seekbar (PRODUCTION-GRADE).
    ///
    /// ---
    ///
    /// ## Interactive Features
    /// - Click anywhere on waveform to seek
    /// - Drag seekbar handle for precise navigation
    /// - Hover feedback with position preview
    /// - Green bar synced with seekbar position
    pub fn render(&mut self, ui: &mut egui::Ui) {
        let card_height = 300.0;
        let available_width = ui.available_width();
        
        // Allocate space for card with click detection
        let (card_rect, waveform_response) = ui.allocate_exact_size(
            Vec2::new(available_width, card_height),
            Sense::click_and_drag(),
        );
        
        // Draw gradient background
        QualiaTheme::fake_gradient_vertical(
            ui,
            card_rect,
            QualiaTheme::BG_PANEL,
            QualiaTheme::BG_DARK,
            20,
        );
        
        // Draw waveform
        if !self.waveform_data.is_empty() {
            self.draw_waveform(ui, card_rect);
        } else {
            ui.painter().text(
                card_rect.center(),
                egui::Align2::CENTER_CENTER,
                "No waveform data - load audio file",
                egui::FontId::proportional(18.0),
                QualiaTheme::TEXT_SECONDARY,
            );
        }
        
        // PRODUCTION FEATURE: Click-to-seek on waveform
        if waveform_response.clicked() || waveform_response.dragged() {
            if let Some(click_pos) = waveform_response.interact_pointer_pos() {
                let normalized_x = ((click_pos.x - card_rect.min.x) / card_rect.width()).clamp(0.0, 1.0);
                self.emit_seek_event(normalized_x);
            }
        }
        
        // Draw playback position green bar
        if self.playback_position > 0.0 {
            let x = card_rect.left() + card_rect.width() * self.playback_position;
            ui.painter().vline(
                x,
                card_rect.y_range(),
                Stroke::new(2.0, QualiaTheme::LIME_GREEN),
            );
        }
        
        // PRODUCTION FEATURE: Full-width seekbar at bottom (Spotify-style)
        self.render_seekbar(ui, card_rect);
        
        // Hover preview (show time at cursor position)
        if waveform_response.hovered() {
            if let Some(hover_pos) = waveform_response.hover_pos() {
                let normalized_x = ((hover_pos.x - card_rect.min.x) / card_rect.width()).clamp(0.0, 1.0);
                self.draw_hover_preview(ui, hover_pos, normalized_x);
            }
        }
    }
    
    /// # Responsibility
    /// Render full-width seekbar at bottom of waveform (PRODUCTION-GRADE).
    fn render_seekbar(&mut self, ui: &mut egui::Ui, waveform_rect: Rect) {
        let seekbar_height = 20.0;
        let seekbar_rect = Rect::from_min_max(
            Pos2::new(waveform_rect.min.x, waveform_rect.max.y - seekbar_height),
            Pos2::new(waveform_rect.max.x, waveform_rect.max.y),
        );
        
        // Background track
        ui.painter().rect_filled(
            seekbar_rect,
            2.0,
            Color32::from_rgba_premultiplied(40, 40, 40, 200),
        );
        
        // Progress bar (filled portion)
        let progress_width = seekbar_rect.width() * self.playback_position;
        let progress_rect = Rect::from_min_max(
            seekbar_rect.min,
            Pos2::new(seekbar_rect.min.x + progress_width, seekbar_rect.max.y),
        );
        
        ui.painter().rect_filled(
            progress_rect,
            2.0,
            QualiaTheme::LIME_GREEN,
        );
        
        // Draggable handle
        let handle_x = seekbar_rect.min.x + progress_width;
        let handle_center = Pos2::new(handle_x, seekbar_rect.center().y);
        let handle_radius = 8.0;
        
        let handle_id = ui.id().with("seekbar_handle");
        let handle_response = ui.interact(
            Rect::from_center_size(handle_center, Vec2::splat(handle_radius * 2.0)),
            handle_id,
            Sense::click_and_drag(),
        );
        
        // Handle drag
        if handle_response.dragged() {
            if let Some(drag_pos) = handle_response.interact_pointer_pos() {
                let normalized_x = ((drag_pos.x - seekbar_rect.min.x) / seekbar_rect.width()).clamp(0.0, 1.0);
                self.emit_seek_event(normalized_x);
            }
        }
        
        // Draw handle
        let handle_color = if handle_response.hovered() {
            Color32::WHITE
        } else {
            QualiaTheme::LIME_GREEN
        };
        
        ui.painter().circle_filled(handle_center, handle_radius, handle_color);
    }
    
    /// # Responsibility
    /// Draw hover preview showing time at cursor position.
    fn draw_hover_preview(&self, ui: &mut egui::Ui, hover_pos: Pos2, normalized_x: f32) {
        let preview_time = self.total_duration.as_secs_f32() * normalized_x;
        let minutes = (preview_time / 60.0) as u32;
        let seconds = (preview_time % 60.0) as u32;
        let preview_text = format!("{}:{:02}", minutes, seconds);
        
        // Tooltip above cursor
        let tooltip_pos = Pos2::new(hover_pos.x, hover_pos.y - 30.0);
        let tooltip_rect = Rect::from_center_size(tooltip_pos, Vec2::new(60.0, 20.0));
        
        ui.painter().rect_filled(
            tooltip_rect,
            4.0,
            Color32::from_rgba_premultiplied(0, 0, 0, 220),
        );
        
        ui.painter().text(
            tooltip_pos,
            egui::Align2::CENTER_CENTER,
            preview_text,
            egui::FontId::proportional(12.0),
            Color32::WHITE,
        );
    }
    
    /// # Responsibility
    /// Emit seek event via EventBus.
    fn emit_seek_event(&self, normalized_position: f32) {
        if let Some(event_bus) = &self.event_bus {
            let seek_time = Duration::from_secs_f32(
                self.total_duration.as_secs_f32() * normalized_position
            );
            
            if let Err(e) = event_bus.emit(AudioForgeEvent::SeekedTo {
                position: seek_time,
            }) {
                tracing::warn!("Failed to emit seek event: {}", e);
            }
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
