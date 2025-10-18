//! # Responsibility
//! Frontend services module.
//!
//! ---
//!
//! Provides all frontend service implementations: scene management, WebSocket
//! communication, audio synthesis, input handling, state management, and UI services.

pub mod audio;
pub mod event_bus;
pub mod input;
pub mod scene_manager;
pub mod state;
pub mod ui;
pub mod websocket;
pub mod workers;

pub use audio::{AudioEventHandlerService, AudioService};
pub use event_bus::EventBusService;
pub use input::{
    ComboResult, InputControllerService, MusicalComboDetectorService,
    MusicalInputAnalyzerService, TimingWindows,
};
pub use scene_manager::SceneManagerService;
pub use state::GameStateStoreService;
pub use websocket::WebSocketService;
