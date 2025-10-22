//! # Responsibility
//! Modular UI widgets following Single Responsibility Principle.
//!
//! ---
//!
//! This module provides reusable UI components that were extracted from
//! the monolithic MainWindow. Each widget encapsulates a specific UI concern
//! and can be tested independently.
//!
//! ## Architecture (Directive 12 & 13)
//! - **Panel trait**: Common interface for all UI panels
//! - **EffectsPanel**: Audio effects controls (8D, drop, bass, treble)
//! - **ControlPanel**: File loading, playback controls, volume, seek bar
//! - **WaveformPanel**: Time-domain waveform visualization
//! - **SpectrumPanel**: Frequency-domain spectrum + instrument detection
//! - **InfoPanel**: Status display and channel configuration

pub mod control_panel;
pub mod effects_panel;
pub mod info_panel;
pub mod visualization_panels;

pub use control_panel::{ControlPanel, ControlPanelState};
pub use effects_panel::EffectsPanel;
pub use info_panel::InfoPanel;
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
    /// ## Parameters
    /// - `ui`: The egui::Ui context for rendering widgets
    ///
    /// ## Returns
    /// `true` if the panel's state changed and requires parent notification
    /// (e.g., config updates that need to propagate to services).
    fn render(&mut self, ui: &mut egui::Ui) -> bool;
}
