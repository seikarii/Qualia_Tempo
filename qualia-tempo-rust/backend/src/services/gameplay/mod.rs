//! # Responsibility
//! Gameplay logic services (game loop, qualia processing, boss AI).

mod game_logic;
mod traits;

pub use game_logic::GameLogicService;
pub use traits::IGameLogicService;
