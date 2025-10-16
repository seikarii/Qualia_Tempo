//! # Responsibility
//! Frontend service layer for all business logic.

pub mod core;
pub mod networking;
pub mod audio;
pub mod input;
pub mod rendering;
pub mod gameplay;      // ✅ Phase 3E
pub mod state;         // ✅ Phase 3G State Services
pub mod ui;            // ✅ Phase 3H UI Services
// pub mod utils;         // TODO: Phase 3E
// pub mod monitoring;    // TODO: Phase 3E
// pub mod debug;         // TODO: Phase 3E
// pub mod lifecycle;     // TODO: Phase 3E
// pub mod interfaces;    // TODO: Phase 3E
// pub mod tests;         // TODO: Phase 3E

pub use core::*;
pub use networking::*;
pub use audio::*;
pub use input::*;
pub use rendering::*;
pub use gameplay::*;
pub use state::*;
pub use ui::*;
