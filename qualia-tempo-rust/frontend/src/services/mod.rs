//! # Responsibility
//! Frontend service layer for all business logic.

pub mod core;
pub mod networking;
pub mod audio;
pub mod input;
pub mod gameplay;
pub mod state;
pub mod ui;
pub mod utils;
pub mod monitoring;
pub mod debug;
pub mod lifecycle;
pub mod interfaces;
pub mod tests;

pub use core::*;
pub use networking::*;
