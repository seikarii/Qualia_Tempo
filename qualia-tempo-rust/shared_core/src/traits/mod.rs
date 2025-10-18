//! # Responsibility
//! Aggregates all service trait interface definitions.

pub mod config;
pub mod event_bus;
pub mod logger;
pub mod service;
pub mod gameplay;

pub use config::{LoadableConfig, ValidatableConfig};
pub use event_bus::IEventBus;
pub use logger::ILogger;
pub use service::IBaseService;
pub use gameplay::{IGameLogicService, IBossAIService, IPatternSystemService, IQualiaProcessorService, ICombatOrchestratorService};
