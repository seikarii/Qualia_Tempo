//! # Responsibility
//! Gameplay mechanics service interface for shared utilities.

use shaku::Interface;

/// # Responsibility
/// Provides gameplay utility functions and constants.
pub trait IGameplayMechanicsService: Interface {
    /// Calculates dash distance based on intensity.
    fn calculate_dash_distance(&self, intensity: f32) -> f32;
    
    /// Calculates ability cooldown with harmony modifier.
    fn calculate_cooldown(&self, base_cooldown_ms: f32, harmony: f32) -> f32;
    
    /// Clamps value to [0.0, 1.0] range.
    fn clamp_normalized(&self, value: f32) -> f32;
    
    /// Linear interpolation between two values.
    fn lerp(&self, a: f32, b: f32, t: f32) -> f32;
    
    /// Checks if position is within arena bounds.
    fn is_in_arena(&self, x: f32, y: f32) -> bool;
}
