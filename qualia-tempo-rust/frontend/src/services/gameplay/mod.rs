//! # Responsibility
//! Frontend gameplay services coordinating game loop and mechanics.

pub mod game_controller;
pub mod combo_detector;
pub mod game_logic;
pub mod qualia_worker_bridge;

pub use game_controller::{GameControllerService, GameControllerConfig};
pub use combo_detector::{ComboDetectorService, ComboDetectorConfig, ComboPattern};
pub use game_logic::{GameLogicService, GameLogicConfig, GameResult};
pub use qualia_worker_bridge::{QualiaWorkerBridgeService, QualiaWorkerConfig, WorkerRequest, WorkerResponse};
