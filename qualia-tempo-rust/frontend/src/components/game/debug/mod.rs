//! # Responsibility
//! Debug components module - diagnostics and monitoring UI.

pub mod service_diagnostics_panel;
pub mod architecture_validation;
pub mod performance_overlay;
pub mod event_log;

pub use service_diagnostics_panel::{ServiceDiagnosticsPanel, ServiceDiagnostic, ServiceStatus};
pub use architecture_validation::{ArchitectureValidation, ArchitectureRule, ValidationResult};
pub use performance_overlay::{PerformanceOverlay, PerformanceMetrics};
pub use event_log::{EventLog, EventLogEntry};
