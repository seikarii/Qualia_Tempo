//! # Responsibility
//! UI widget exports (panels, visualizations, controls).
//!
//! ---
//!
//! ## Widget Architecture
//! - **Panel**: Base widget trait for reusable UI components
//! - **EffectsPanel**: DSP effect controls (8D, drop, bass/treble boost)
//! - **HeroWaveformCard**: Large waveform visualization (300px, center focal point)
//! - **MultiBandSpectrumGrid**: Multi-band spectrum visualizer (6-12 bars)
//! - **ModernPlaybackBar**: Bottom playback controls (Spotify-style)

pub mod effects_panel;
pub mod hero_waveform_card;
pub mod modern_playback_bar;
pub mod multi_band_spectrum_grid;
pub mod playlist_panel;
pub mod visualization_panels;

pub use effects_panel::EffectsPanel;
pub use hero_waveform_card::HeroWaveformCard;
pub use modern_playback_bar::{ModernPlaybackBar, PlaybackBarState};
pub use multi_band_spectrum_grid::MultiBandSpectrumGrid;
pub use playlist_panel::{AudioTrack, PlaylistPanel, PlaylistState};
pub use visualization_panels::{SpectrumPanel, WaveformPanel};

use egui;

/// # Responsibility
/// Common interface for modular UI panels.
///
/// ---
///
/// This trait enables:
/// - **Composition**: MainWindow composes multiple panels
/// - **Testability**: Each panel can be unit tested independently
/// - **Reusability**: Panels can be reused in different contexts
/// - **SRP Compliance**: Each panel has one reason to change
///
/// ## Design Pattern
/// This follows the **Strategy Pattern** where MainWindow delegates
/// rendering responsibilities to specialized panel implementations.
pub trait Panel {
    /// # Responsibility
    /// Render this panel's UI within the provided egui context.
    ///
    /// ---
    ///
    /// ## Parameters (Directive 14)
    /// - `ctx`: The egui::Context for window-level operations (dialogs, repaints)
    /// - `ui`: The egui::Ui context for rendering widgets
    ///
    /// ## Returns
    /// `true` if the panel's state changed and requires parent notification
    /// (e.g., config updates that need to propagate to services).
    ///
    /// ## Design Note
    /// Context access enables panels to own complex interactions like async
    /// file dialogs without leaking responsibility to parent containers.
    fn render(&mut self, ctx: &egui::Context, ui: &mut egui::Ui) -> bool;
}
