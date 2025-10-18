//! # Responsibility
//! State management services for reactive game state.
//!
//! ---
//!
//! Provides reactive stores and state synchronization services.

pub mod combat_state_aggregator;
pub mod game_state_store;
pub mod game_state_subscriber;
pub mod local_qualia_state;

pub use combat_state_aggregator::CombatStateAggregatorService;
pub use game_state_store::GameStateStoreService;
pub use game_state_subscriber::GameStateSubscriberService;
pub use local_qualia_state::LocalQualiaStateService;
