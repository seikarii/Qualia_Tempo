//! # Responsibility
//! Backend service implementations and DI module registration.
//!
//! ---
//!
//! This module contains all backend service implementations organized by
//! category (core, lifecycle, gameplay). The GameModule at the bottom
//! registers all services for Shaku dependency injection.

pub mod core;
pub mod lifecycle;
pub mod gameplay;

use shaku::module;

// Re-export service implementations for composition root
pub use core::{EventBusService, QualiaLogger, IGameEventBus};
pub use lifecycle::{ApplicationInitializerService, IApplicationInitializer};
pub use gameplay::{GameLogicService, BossAIService, IGameLogicService, IBossAI};

// Re-export trait interfaces
pub use shared_core::traits::ILogger;

// Shaku DI module - registers all backend services
// This is the DI container for the backend. All services are registered here
// and resolved in main.rs (Composition Root pattern per QUALIA.CODE.RUST §2.1).
module! {
    pub GameModule {
        components = [
            QualiaLogger,
            EventBusService,
            ApplicationInitializerService,
            GameLogicService,
            BossAIService,
        ],
        providers = []
    }
}
