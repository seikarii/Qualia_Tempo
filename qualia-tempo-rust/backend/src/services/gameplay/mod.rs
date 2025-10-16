//! # Responsibility
//! Provides gameplay services - game logic, state management, boss AI, pattern system.
//!
//! ---
//!
//! This module contains the core gameplay loop: processing player actions,
//! calculating qualia state, managing boss behavior, coordinating combat, and loading attack patterns.

pub mod state_store;
pub mod game_logic;
pub mod boss_ai;
pub mod combat_orchestrator;
pub mod pattern_system;

pub use state_store::{StateStoreService, IStateStore};
pub use game_logic::{GameLogicService, IGameLogicService};
pub use boss_ai::{BossAIService, IBossAIService};
pub use combat_orchestrator::{CombatOrchestratorService, ICombatOrchestratorService};
pub use pattern_system::{PatternSystemService, IPatternSystemService, PatternSystemConfig};
