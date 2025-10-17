//! # Responsibility
//! Game components module - UI and gameplay elements.

pub mod core;
pub mod hud;
pub mod field_layers;
pub mod layout;
pub mod debug;

// Re-export commonly used components
pub use core::{QualiaTempoGame, GamePhase, FieldContainer};
pub use layout::{MainLayout, ScreenState};
pub use debug::{
    ServiceDiagnosticsPanel, ArchitectureValidation, PerformanceOverlay, EventLog
};
