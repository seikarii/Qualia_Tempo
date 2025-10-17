//! # Responsibility
//! HUD components module - in-game UI overlays.

pub mod qualia_orb;
pub mod score_display;
pub mod combo_streak;
pub mod health_visualization;
pub mod time_display;
pub mod kairos_meter;
pub mod intensity_indicator;
pub mod transcendence_gauge;
pub mod boss_phase_indicator;
pub mod pattern_preview;

pub use qualia_orb::QualiaOrb;
pub use score_display::ScoreDisplay;
pub use combo_streak::ComboStreak;
pub use health_visualization::HealthVisualization;
pub use time_display::{TimeDisplay, TimeDisplayMode};
pub use kairos_meter::{KairosMeter, KairosOrientation};
pub use intensity_indicator::{IntensityIndicator, IntensityStyle};
pub use transcendence_gauge::TranscendenceGauge;
pub use boss_phase_indicator::BossPhaseIndicator;
pub use pattern_preview::{PatternPreview, PatternType};
