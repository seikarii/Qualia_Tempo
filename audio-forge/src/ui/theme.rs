//! # Responsibility
//! Global theme system with modern dark color palette.
//!
//! ---
//!
//! Provides centralized color definitions and egui style configuration.
//! Replaces scattered hardcoded colors throughout UI components.

use egui::{Color32, Context, Style, Visuals};

/// # Responsibility
/// Modern dark theme color palette (professional grade).
///
/// ---
///
/// Color scheme: Dark base + Turquoise accents + High contrast
pub struct QualiaTheme;

impl QualiaTheme {
    // === BACKGROUND COLORS ===
    pub const BG_DARK: Color32 = Color32::from_rgb(15, 17, 21);          // Deep dark blue-black
    pub const BG_PANEL: Color32 = Color32::from_rgb(22, 25, 31);         // Panel background
    pub const BG_WIDGET: Color32 = Color32::from_rgb(30, 34, 42);        // Widget background
    pub const BG_HOVER: Color32 = Color32::from_rgb(40, 44, 52);         // Hover state
    
    // === ACCENT COLORS ===
    pub const ACCENT_PRIMARY: Color32 = Color32::from_rgb(64, 224, 208);  // Turquoise (main accent)
    pub const ACCENT_SECONDARY: Color32 = Color32::from_rgb(100, 180, 255); // Blue (secondary)
    pub const ACCENT_SUCCESS: Color32 = Color32::from_rgb(80, 250, 123);  // Green (success)
    pub const ACCENT_WARNING: Color32 = Color32::from_rgb(255, 184, 108); // Orange (warning)
    pub const ACCENT_ERROR: Color32 = Color32::from_rgb(255, 100, 100);   // Soft red (error)
    
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
        
        // === SPACING ===
        style.spacing.item_spacing = egui::vec2(8.0, 6.0);
        style.spacing.button_padding = egui::vec2(12.0, 6.0);
        style.spacing.window_margin = egui::Margin::same(10);
        
        style.visuals = visuals;
        ctx.set_style(style);
    }
}
