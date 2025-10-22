//! # Responsibility
//! Global theme system with modern dark color palette.
//!
//! ---
//!
//! Provides centralized color definitions and egui style configuration.
//! Replaces scattered hardcoded colors throughout UI components.

use egui::{Color32, Context, Style, Visuals};

/// # Responsibility
/// Modern dark theme color palette (2025 professional grade).
///
/// ---
///
/// Color scheme: Dark base + Neon accents + Gradient overlays
pub struct QualiaTheme;

impl QualiaTheme {
    // === BACKGROUND COLORS ===
    pub const BG_DARK: Color32 = Color32::from_rgb(15, 17, 21);          // Deep dark blue-black
    pub const BG_PANEL: Color32 = Color32::from_rgb(22, 25, 31);         // Panel background
    pub const BG_WIDGET: Color32 = Color32::from_rgb(30, 34, 42);        // Widget background
    pub const BG_HOVER: Color32 = Color32::from_rgb(40, 44, 52);         // Hover state
    
    // === ACCENT COLORS (ORIGINAL) ===
    pub const ACCENT_PRIMARY: Color32 = Color32::from_rgb(64, 224, 208);  // Turquoise (main accent)
    pub const ACCENT_SECONDARY: Color32 = Color32::from_rgb(100, 180, 255); // Blue (secondary)
    pub const ACCENT_SUCCESS: Color32 = Color32::from_rgb(80, 250, 123);  // Green (success)
    pub const ACCENT_WARNING: Color32 = Color32::from_rgb(255, 184, 108); // Orange (warning)
    pub const ACCENT_ERROR: Color32 = Color32::from_rgb(255, 100, 100);   // Soft red (error)
    
    // === NEON ACCENT COLORS (2025 MODERN) ===
    pub const NEON_BLUE: Color32 = Color32::from_rgb(0, 168, 255);        // Electric blue
    pub const ELECTRIC_PURPLE: Color32 = Color32::from_rgb(138, 43, 226); // Vibrant purple
    pub const HOT_PINK: Color32 = Color32::from_rgb(255, 20, 147);        // Hot pink
    pub const LIME_GREEN: Color32 = Color32::from_rgb(50, 255, 100);      // Active state
    
    // === GRADIENT COLORS (For simulation) ===
    pub const GRADIENT_PRIMARY_START: Color32 = Self::NEON_BLUE;
    pub const GRADIENT_PRIMARY_END: Color32 = Self::ELECTRIC_PURPLE;
    pub const GRADIENT_ACCENT_START: Color32 = Color32::from_rgb(64, 224, 208); // Turquoise
    pub const GRADIENT_ACCENT_END: Color32 = Self::NEON_BLUE;
    
    // === SPACING (Modern breathing room) ===
    pub const SPACING_CARD_PADDING: f32 = 20.0;    // Inner card padding
    pub const SPACING_PANEL_MARGIN: f32 = 16.0;    // Between panels
    pub const SPACING_ITEM_GAP: f32 = 12.0;        // Between UI elements
    
    // === TEXT COLORS ===
    pub const TEXT_PRIMARY: Color32 = Color32::from_rgb(235, 240, 245);   // Main text
    pub const TEXT_SECONDARY: Color32 = Color32::from_rgb(180, 190, 200); // Secondary text
    pub const TEXT_DISABLED: Color32 = Color32::from_rgb(100, 110, 120);  // Disabled text
    
    // === BORDER COLORS ===
    pub const BORDER_DEFAULT: Color32 = Color32::from_rgb(50, 55, 65);    // Default border
    pub const BORDER_FOCUS: Color32 = Color32::from_rgb(64, 224, 208);    // Focused border
    
    // === SEMANTIC COLORS ===
    pub const STATUS_PLAYING: Color32 = Color32::from_rgb(80, 250, 123);  // Green
    pub const STATUS_STOPPED: Color32 = Color32::from_rgb(255, 100, 100); // Red
    pub const STATUS_8_1_ENABLED: Color32 = Color32::from_rgb(64, 224, 208); // Turquoise
    pub const STATUS_STEREO: Color32 = Color32::from_rgb(100, 180, 255);  // Blue
    
    /// # Responsibility
    /// Apply theme to egui context (global styling).
    ///
    /// ---
    ///
    /// Call this ONCE during application initialization.
    /// Overrides default egui visuals with custom theme.
    pub fn apply(ctx: &Context) {
        let mut style = Style::default();
        let mut visuals = Visuals::dark();
        
        // === GLOBAL COLORS ===
        visuals.widgets.noninteractive.bg_fill = Self::BG_WIDGET;
        visuals.widgets.noninteractive.bg_stroke.color = Self::BORDER_DEFAULT;
        visuals.widgets.noninteractive.fg_stroke.color = Self::TEXT_PRIMARY;
        
        visuals.widgets.inactive.bg_fill = Self::BG_WIDGET;
        visuals.widgets.inactive.bg_stroke.color = Self::BORDER_DEFAULT;
        visuals.widgets.inactive.fg_stroke.color = Self::TEXT_PRIMARY;
        
        visuals.widgets.hovered.bg_fill = Self::BG_HOVER;
        visuals.widgets.hovered.bg_stroke.color = Self::ACCENT_PRIMARY;
        visuals.widgets.hovered.fg_stroke.color = Self::TEXT_PRIMARY;
        
        visuals.widgets.active.bg_fill = Self::ACCENT_PRIMARY;
        visuals.widgets.active.bg_stroke.color = Self::ACCENT_PRIMARY;
        visuals.widgets.active.fg_stroke.color = Self::BG_DARK;
        
        visuals.widgets.open.bg_fill = Self::BG_HOVER;
        visuals.widgets.open.bg_stroke.color = Self::ACCENT_PRIMARY;
        
        // === SELECTION ===
        visuals.selection.bg_fill = Self::ACCENT_PRIMARY.linear_multiply(0.3);
        visuals.selection.stroke.color = Self::ACCENT_PRIMARY;
        
        // === WINDOW BACKGROUND ===
        visuals.window_fill = Self::BG_PANEL;
        visuals.panel_fill = Self::BG_PANEL;
        visuals.extreme_bg_color = Self::BG_DARK;
        
        // === SLIDERS ===
        visuals.widgets.inactive.bg_fill = Self::BG_WIDGET;
        visuals.widgets.active.bg_fill = Self::ACCENT_PRIMARY;
        
        // === BUTTONS ===
        visuals.widgets.inactive.weak_bg_fill = Self::BG_WIDGET;
        visuals.widgets.hovered.weak_bg_fill = Self::BG_HOVER;
        visuals.widgets.active.weak_bg_fill = Self::ACCENT_PRIMARY;
        
        // === TEXT ===
        visuals.override_text_color = Some(Self::TEXT_PRIMARY);
        visuals.hyperlink_color = Self::ACCENT_SECONDARY;
        visuals.warn_fg_color = Self::ACCENT_WARNING;
        visuals.error_fg_color = Self::ACCENT_ERROR;
        
        // === SPACING (Modern breathing room) ===
        style.spacing.item_spacing = egui::vec2(Self::SPACING_ITEM_GAP, 8.0);
        style.spacing.button_padding = egui::vec2(16.0, 8.0);
        style.spacing.window_margin = egui::Margin::same(16);
        
        style.visuals = visuals;
        ctx.set_style(style);
    }
    
    /// # Responsibility
    /// Simulate vertical gradient with overlapping rects (egui limitation workaround).
    ///
    /// ---
    ///
    /// egui lacks native gradient support. This draws N rects with interpolated colors.
    pub fn fake_gradient_vertical(
        ui: &mut egui::Ui,
        rect: egui::Rect,
        top_color: Color32,
        bottom_color: Color32,
        steps: usize,
    ) {
        let height_per_step = rect.height() / steps as f32;
        for i in 0..steps {
            let t = i as f32 / (steps - 1).max(1) as f32;
            let color = Self::lerp_color(top_color, bottom_color, t);
            let step_rect = egui::Rect::from_min_size(
                egui::pos2(rect.min.x, rect.min.y + i as f32 * height_per_step),
                egui::vec2(rect.width(), height_per_step),
            );
            ui.painter().rect_filled(step_rect, 0.0, color);
        }
    }
    
    /// # Responsibility
    /// Linear color interpolation between two Color32 values.
    fn lerp_color(a: Color32, b: Color32, t: f32) -> Color32 {
        Color32::from_rgba_premultiplied(
            (a.r() as f32 + (b.r() as f32 - a.r() as f32) * t) as u8,
            (a.g() as f32 + (b.g() as f32 - a.g() as f32) * t) as u8,
            (a.b() as f32 + (b.b() as f32 - a.b() as f32) * t) as u8,
            (a.a() as f32 + (b.a() as f32 - a.a() as f32) * t) as u8,
        )
    }
}
