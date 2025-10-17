//! # Responsibility
//! High-fidelity mock for IGameplayMechanicsService trait.

use crate::services::interfaces::IGameplayMechanicsService;
use mockall::*;

mock! {
    /// # Responsibility
    /// High-fidelity mock for IGameplayMechanicsService, used in unit tests.
    pub GameplayMechanicsService {}
    
    impl IGameplayMechanicsService for GameplayMechanicsService {
        fn calculate_dash_distance(&self, intensity: f32) -> f32;
        fn calculate_cooldown(&self, base_cooldown_ms: f32, harmony: f32) -> f32;
        fn clamp_normalized(&self, value: f32) -> f32;
        fn lerp(&self, a: f32, b: f32, t: f32) -> f32;
        fn is_in_arena(&self, x: f32, y: f32) -> bool;
    }
}
