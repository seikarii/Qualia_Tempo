//! # Responsibility
//! UI services for HUD, notifications, and debug overlays.
//!
//! ---
//!
//! Provides UI rendering services that react to game state changes.

pub mod debug_overlay_service;
pub mod hud_service;
pub mod toast_notification_service;

pub use debug_overlay_service::{DebugOverlayService, FrameTiming};
pub use hud_service::HUDService;
pub use toast_notification_service::{ToastNotification, ToastNotificationService, ToastType};

