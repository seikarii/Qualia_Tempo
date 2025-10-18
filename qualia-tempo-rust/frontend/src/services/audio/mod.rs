//! # Responsibility
//! Audio services module for Web Audio API integration.
//!
//! ---
//!
//! Contains the Performance Engine implementation from MUSIC.RUST.md.

pub mod audio_service;
pub mod audio_event_handler;

pub use audio_service::AudioService;
pub use audio_event_handler::AudioEventHandlerService;
