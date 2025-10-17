//! # Responsibility
//! Implements gameplay mechanics service with formulas and utility functions.
//!
//! ---
//!
//! Provides calculations for dash distance, cooldowns, clamping, lerping,
//! arena bounds checking, and other shared gameplay utilities.

use crate::services::interfaces::IGameplayMechanicsService;
use shaku::{Component, Interface};
use tracing::info;

// Gameplay constants
const ARENA_WIDTH: f32 = 20.0;
const ARENA_HEIGHT: f32 = 20.0;
const MAX_DASH_DISTANCE: f32 = 10.0;
const MIN_COOLDOWN_MS: f32 = 100.0;
const BASE_DASH_DISTANCE: f32 = 5.0;

/// # Responsibility
/// Implements IGameplayMechanicsService with formula calculations and utilities.
#[derive(Component)]
#[shaku(interface = IGameplayMechanicsService)]
pub struct GameplayMechanicsService;

impl GameplayMechanicsService {
    /// # Responsibility
    /// Creates new GameplayMechanicsService.
    pub fn new() -> Self {
        info!("GameplayMechanicsService initialized with constants: ARENA={}x{}, MAX_DASH={}, MIN_COOLDOWN={}ms",
            ARENA_WIDTH, ARENA_HEIGHT, MAX_DASH_DISTANCE, MIN_COOLDOWN_MS);
        Self
    }
    
    /// # Responsibility
    /// Normalizes angle to [-π, π] range.
    pub fn normalize_angle(&self, angle: f32) -> f32 {
        let pi = std::f32::consts::PI;
        let mut result = angle % (2.0 * pi);
        if result > pi {
            result -= 2.0 * pi;
        } else if result < -pi {
            result += 2.0 * pi;
        }
        result
    }
    
    /// # Responsibility
    /// Calculates 2D distance between two points.
    pub fn distance_2d(&self, x1: f32, y1: f32, x2: f32, y2: f32) -> f32 {
        let dx = x2 - x1;
        let dy = y2 - y1;
        (dx * dx + dy * dy).sqrt()
    }
    
    /// # Responsibility
    /// Finds closest point on circle to given point.
    pub fn closest_point_on_circle(&self, cx: f32, cy: f32, radius: f32, px: f32, py: f32) -> (f32, f32) {
        let dx = px - cx;
        let dy = py - cy;
        let distance = (dx * dx + dy * dy).sqrt();
        
        if distance < 0.001 {
            return (cx + radius, cy);
        }
        
        let scale = radius / distance;
        (cx + dx * scale, cy + dy * scale)
    }
}

impl IGameplayMechanicsService for GameplayMechanicsService {
    fn calculate_dash_distance(&self, intensity: f32) -> f32 {
        let clamped_intensity = self.clamp_normalized(intensity);
        let distance = BASE_DASH_DISTANCE * clamped_intensity;
        distance.min(MAX_DASH_DISTANCE)
    }
    
    fn calculate_cooldown(&self, base_cooldown_ms: f32, harmony: f32) -> f32 {
        let clamped_harmony = self.clamp_normalized(harmony);
        let cooldown = base_cooldown_ms * (1.0 - clamped_harmony * 0.5);
        cooldown.max(MIN_COOLDOWN_MS)
    }
    
    fn clamp_normalized(&self, value: f32) -> f32 {
        value.clamp(0.0, 1.0)
    }
    
    fn lerp(&self, a: f32, b: f32, t: f32) -> f32 {
        a + (b - a) * t
    }
    
    fn is_in_arena(&self, x: f32, y: f32) -> bool {
        let half_width = ARENA_WIDTH / 2.0;
        let half_height = ARENA_HEIGHT / 2.0;
        x >= -half_width && x <= half_width && y >= -half_height && y <= half_height
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    fn create_test_service() -> GameplayMechanicsService {
        GameplayMechanicsService::new()
    }
    
    #[test]
    fn test_calculate_dash_distance_min_intensity() {
        let service = create_test_service();
        let distance = service.calculate_dash_distance(0.0);
        assert_eq!(distance, 0.0);
    }
    
    #[test]
    fn test_calculate_dash_distance_max_intensity() {
        let service = create_test_service();
        let distance = service.calculate_dash_distance(1.0);
        assert_eq!(distance, BASE_DASH_DISTANCE);
    }
    
    #[test]
    fn test_calculate_cooldown_zero_harmony() {
        let service = create_test_service();
        let cooldown = service.calculate_cooldown(1000.0, 0.0);
        assert_eq!(cooldown, 1000.0);
    }
    
    #[test]
    fn test_calculate_cooldown_max_harmony() {
        let service = create_test_service();
        let cooldown = service.calculate_cooldown(1000.0, 1.0);
        assert_eq!(cooldown, 500.0); // 50% reduction
    }
    
    #[test]
    fn test_clamp_normalized_below_zero() {
        let service = create_test_service();
        let clamped = service.clamp_normalized(-0.5);
        assert_eq!(clamped, 0.0);
    }
    
    #[test]
    fn test_clamp_normalized_above_one() {
        let service = create_test_service();
        let clamped = service.clamp_normalized(1.5);
        assert_eq!(clamped, 1.0);
    }
    
    #[test]
    fn test_lerp_midpoint() {
        let service = create_test_service();
        let result = service.lerp(0.0, 10.0, 0.5);
        assert_eq!(result, 5.0);
    }
    
    #[test]
    fn test_is_in_arena_center() {
        let service = create_test_service();
        assert!(service.is_in_arena(0.0, 0.0));
    }
    
    #[test]
    fn test_is_in_arena_outside() {
        let service = create_test_service();
        assert!(!service.is_in_arena(15.0, 0.0)); // Beyond arena width
        assert!(!service.is_in_arena(0.0, 15.0)); // Beyond arena height
    }
    
    #[test]
    fn test_distance_calculation_accuracy() {
        let service = create_test_service();
        let distance = service.distance_2d(0.0, 0.0, 3.0, 4.0);
        assert_eq!(distance, 5.0); // 3-4-5 triangle
    }
}
