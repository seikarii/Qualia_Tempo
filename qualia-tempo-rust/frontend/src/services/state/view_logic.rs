//! # Responsibility
//! Transforms game state into view-specific data structures.
//!
//! ---
//!
//! Isolates view concerns from game logic, calculating UI-specific
//! data (health bars, camera position, animation states, etc.).

use std::sync::Arc;
use shared_core::contracts::{CombatState, QualiaState};
use shared_core::utils::Vector3;
use crate::services::core::ILogger;

/// # Responsibility
/// Configuration for view logic calculations.
#[derive(Debug, Clone)]
pub struct ViewLogicConfig {
    /// Whether to enable camera shake on damage
    pub enable_camera_shake: bool,
    
    /// Camera shake intensity (0.0-1.0)
    pub camera_shake_intensity: f32,
    
    /// Whether to enable low-health vignette effect
    pub enable_low_health_vignette: bool,
    
    /// Health threshold for low-health effects (0.0-1.0)
    pub low_health_threshold: f32,
}

impl Default for ViewLogicConfig {
    fn default() -> Self {
        Self {
            enable_camera_shake: true,
            camera_shake_intensity: 0.5,
            enable_low_health_vignette: true,
            low_health_threshold: 0.3,
        }
    }
}

/// # Responsibility
/// Camera position for rendering.
#[derive(Debug, Clone)]
pub struct CameraState {
    pub x: f32,
    pub y: f32,
    pub zoom: f32,
    pub shake_offset_x: f32,
    pub shake_offset_y: f32,
}

/// # Responsibility
/// Health bar visualization data.
#[derive(Debug, Clone)]
pub struct HealthBarData {
    pub current_percent: f32, // 0.0-1.0
    pub color: String,        // Hex color
    pub is_critical: bool,    // Below low_health_threshold
}

/// # Responsibility
/// View-specific data for UI rendering.
#[derive(Debug, Clone)]
pub struct ViewData {
    pub camera: CameraState,
    pub player_health: HealthBarData,
    pub boss_health: HealthBarData,
    pub vignette_intensity: f32, // 0.0-1.0
    pub time_display: String,    // "1:23" format
}

/// # Responsibility
/// Transforms game state into view-specific data.
///
/// ---
///
/// Calculates camera position, health bar percentages, UI element states,
/// and other view concerns. Isolates rendering logic from game logic.
pub struct ViewLogicService {
    config: ViewLogicConfig,
    logger: Arc<dyn ILogger>,
    
    // Camera shake state
    shake_time_remaining: std::cell::Cell<f32>,
}

impl ViewLogicService {
    /// # Responsibility
    /// Creates new view logic service.
    pub fn new(config: ViewLogicConfig, logger: Arc<dyn ILogger>) -> Self {
        Self {
            config,
            logger,
            shake_time_remaining: std::cell::Cell::new(0.0),
        }
    }
    
    /// # Responsibility
    /// Transforms combat state into view data.
    pub fn compute_view_data(&self, combat_state: &CombatState) -> ViewData {
        ViewData {
            camera: self.compute_camera_state(combat_state),
            player_health: self.compute_health_bar(&combat_state.player.health, &100.0), // Player max is 100
            boss_health: self.compute_health_bar(&combat_state.boss.health, &combat_state.boss.max_health),
            vignette_intensity: self.compute_vignette_intensity(&combat_state.player.health, &100.0),
            time_display: Self::format_time(combat_state.elapsed_time),
        }
    }
    
    /// # Responsibility
    /// Calculates camera position following player.
    fn compute_camera_state(&self, combat_state: &CombatState) -> CameraState {
        let player_pos = &combat_state.player.position;
        
        // Camera follows player with slight lerp for smoothness
        let camera_x = player_pos.x;
        let camera_y = player_pos.y;
        
        // Calculate camera shake offset
        let (shake_x, shake_y) = self.compute_camera_shake();
        
        // Zoom based on qualia intensity
        let zoom = 1.0 + combat_state.qualia_state.intensity * 0.2;
        
        CameraState {
            x: camera_x,
            y: camera_y,
            zoom,
            shake_offset_x: shake_x,
            shake_offset_y: shake_y,
        }
    }
    
    /// # Responsibility
    /// Computes camera shake offset based on remaining shake time.
    fn compute_camera_shake(&self) -> (f32, f32) {
        let remaining = self.shake_time_remaining.get();
        if remaining <= 0.0 || !self.config.enable_camera_shake {
            return (0.0, 0.0);
        }
        
        // Decay shake over time
        self.shake_time_remaining.set(remaining - 0.016); // ~60 FPS
        
        // Random shake direction with intensity falloff
        let intensity = self.config.camera_shake_intensity * (remaining / 0.5);
        let angle = remaining * 10.0; // Pseudo-random angle
        
        let shake_x = angle.sin() * intensity;
        let shake_y = angle.cos() * intensity;
        
        (shake_x, shake_y)
    }
    
    /// # Responsibility
    /// Triggers camera shake effect.
    pub fn trigger_camera_shake(&self, duration_sec: f32) {
        if self.config.enable_camera_shake {
            self.shake_time_remaining.set(duration_sec);
        }
    }
    
    /// # Responsibility
    /// Computes health bar visualization data.
    fn compute_health_bar(&self, current: &f32, max: &f32) -> HealthBarData {
        let percent = if *max > 0.0 {
            (*current / *max).clamp(0.0, 1.0)
        } else {
            // Player max health is always 100.0
            (*current / 100.0).clamp(0.0, 1.0)
        };
        
        let is_critical = percent < self.config.low_health_threshold;
        
        let color = if is_critical {
            "#EF4444".to_string() // Red
        } else if percent < 0.6 {
            "#F59E0B".to_string() // Amber
        } else {
            "#10B981".to_string() // Green
        };
        
        HealthBarData {
            current_percent: percent,
            color,
            is_critical,
        }
    }
    
    /// # Responsibility
    /// Computes vignette intensity for low health effect.
    fn compute_vignette_intensity(&self, current_health: &f32, max_health: &f32) -> f32 {
        if !self.config.enable_low_health_vignette {
            return 0.0;
        }
        
        let health_percent = if *max_health > 0.0 {
            (*current_health / *max_health).clamp(0.0, 1.0)
        } else {
            0.0
        };
        
        if health_percent > self.config.low_health_threshold {
            return 0.0;
        }
        
        // Vignette increases as health decreases below threshold
        let normalized = 1.0 - (health_percent / self.config.low_health_threshold);
        normalized * 0.7 // Max 70% vignette opacity
    }
    
    /// # Responsibility
    /// Formats elapsed time as "M:SS" display.
    fn format_time(elapsed_sec: f64) -> String {
        let total_seconds = elapsed_sec as u32;
        let minutes = total_seconds / 60;
        let seconds = total_seconds % 60;
        
        format!("{}:{:02}", minutes, seconds)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    // Mock logger for tests
    struct MockLogger;
    impl crate::services::core::ILogger for MockLogger {
        fn trace(&self, _message: &str) {}
        fn debug(&self, _message: &str) {}
        fn info(&self, _message: &str) {}
        fn warn(&self, _message: &str) {}
        fn error(&self, _message: &str) {}
    }
    
    fn create_test_service() -> ViewLogicService {
        let config = ViewLogicConfig::default();
        let logger = Arc::new(MockLogger);
        ViewLogicService::new(config, logger)
    }
    
    fn create_test_combat_state() -> CombatState {
        let mut state = CombatState::default();
        state.player.position = shared_core::contracts::Vector3::new(5.0, 3.0, 0.0);
        state.player.health = 75.0;
        state.boss.health = 800.0;
        state.boss.max_health = 1000.0;
        state.elapsed_time = 65.0;
        state.score = 1000;
        state
    }
    
    #[test]
    fn test_view_logic_creation() {
        let service = create_test_service();
        assert_eq!(service.config.camera_shake_intensity, 0.5);
        assert_eq!(service.config.low_health_threshold, 0.3);
    }
    
    #[test]
    fn test_compute_view_data() {
        let service = create_test_service();
        let combat_state = create_test_combat_state();
        
        let view_data = service.compute_view_data(&combat_state);
        
        assert_eq!(view_data.camera.x, 5.0);
        assert_eq!(view_data.camera.y, 3.0);
        assert_eq!(view_data.player_health.current_percent, 0.75);
        assert!((view_data.boss_health.current_percent - 0.8).abs() < 0.01);
    }
    
    #[test]
    fn test_health_bar_colors() {
        let service = create_test_service();
        
        // Green (healthy)
        let healthy = service.compute_health_bar(&80.0, &100.0);
        assert_eq!(healthy.color, "#10B981");
        assert!(!healthy.is_critical);
        
        // Amber (wounded)
        let wounded = service.compute_health_bar(&50.0, &100.0);
        assert_eq!(wounded.color, "#F59E0B");
        assert!(!wounded.is_critical);
        
        // Red (critical)
        let critical = service.compute_health_bar(&20.0, &100.0);
        assert_eq!(critical.color, "#EF4444");
        assert!(critical.is_critical);
    }
    
    #[test]
    fn test_vignette_intensity() {
        let service = create_test_service();
        
        // No vignette when healthy
        assert_eq!(service.compute_vignette_intensity(&80.0, &100.0), 0.0);
        
        // Vignette appears at 30% health threshold
        assert_eq!(service.compute_vignette_intensity(&30.0, &100.0), 0.0);
        
        // Vignette increases as health drops below 30%
        let intensity_20 = service.compute_vignette_intensity(&20.0, &100.0);
        assert!(intensity_20 > 0.0);
        
        // Max vignette at 0% health
        let intensity_0 = service.compute_vignette_intensity(&0.0, &100.0);
        assert_eq!(intensity_0, 0.7);
    }
    
    #[test]
    fn test_camera_shake_trigger() {
        let service = create_test_service();
        
        // Initially no shake
        assert_eq!(service.shake_time_remaining.get(), 0.0);
        
        // Trigger shake
        service.trigger_camera_shake(0.5);
        assert_eq!(service.shake_time_remaining.get(), 0.5);
    }
    
    #[test]
    fn test_time_formatting() {
        assert_eq!(ViewLogicService::format_time(0.0), "0:00");
        assert_eq!(ViewLogicService::format_time(59.0), "0:59");
        assert_eq!(ViewLogicService::format_time(60.0), "1:00");
        assert_eq!(ViewLogicService::format_time(65.0), "1:05");
        assert_eq!(ViewLogicService::format_time(125.5), "2:05");
    }
}
