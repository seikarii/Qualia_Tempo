//! # Responsibility
//! Merges authoritative backend state with predictive frontend state.
//!
//! ---
//!
//! Resolves conflicts when frontend predictions diverge from backend authority.
//! Backend always wins, but frontend interpolates smoothly to prevent visual jumps.

use std::sync::Arc;
use shared_core::contracts::{CombatState, QualiaState};
use shared_core::utils::Vector3;
use crate::services::core::ILogger;

/// # Responsibility
/// Configuration for state merging behavior.
#[derive(Debug, Clone)]
pub struct StateMergerConfig {
    /// Whether to enable client-side prediction
    pub enable_prediction: bool,
    
    /// Interpolation factor (0.0-1.0) for smooth convergence
    /// Higher = faster convergence, lower = smoother
    pub interpolation_factor: f32,
    
    /// Threshold for teleporting vs interpolating position
    /// If distance exceeds this, teleport instead of lerp
    pub teleport_threshold: f32,
}

impl Default for StateMergerConfig {
    fn default() -> Self {
        Self {
            enable_prediction: true,
            interpolation_factor: 0.3, // 30% per frame toward backend
            teleport_threshold: 5.0,   // 5 units
        }
    }
}

/// # Responsibility
/// Manages state merging between backend authority and frontend prediction.
///
/// ---
///
/// When backend state arrives, resolves conflicts with frontend predictions.
/// Uses linear interpolation for smooth visual transitions.
pub struct StateMergerService {
    config: StateMergerConfig,
    logger: Arc<dyn ILogger>,
}

impl StateMergerService {
    /// # Responsibility
    /// Creates new state merger service.
    pub fn new(config: StateMergerConfig, logger: Arc<dyn ILogger>) -> Self {
        Self { config, logger }
    }
    
    /// # Responsibility
    /// Merges backend combat state with frontend prediction.
    ///
    /// Backend state is authoritative, but frontend interpolates smoothly.
    pub fn merge_combat_state(
        &self,
        backend: CombatState,
        frontend_predicted: Option<CombatState>,
    ) -> CombatState {
        if !self.config.enable_prediction {
            return backend;
        }
        
        let Some(predicted) = frontend_predicted else {
            // No prediction, use backend directly
            return backend;
        };
        
        // Check for major divergence (e.g., player position)
        if Self::should_teleport(
            &backend,
            &predicted,
            self.config.teleport_threshold,
        ) {
            self.logger.warn("State divergence detected, teleporting to backend state");
            return backend;
        }
        
        // Interpolate toward backend state
        self.interpolate_combat_state(backend, predicted)
    }
    
    /// # Responsibility
    /// Checks if states diverged too much for interpolation.
    fn should_teleport(
        backend: &CombatState,
        predicted: &CombatState,
        threshold: f32,
    ) -> bool {
        // Check player position divergence
        let distance = backend.player.position.distance(predicted.player.position);
        distance > threshold
    }
    
    /// # Responsibility
    /// Interpolates combat state toward backend authority.
    fn interpolate_combat_state(
        &self,
        backend: CombatState,
        predicted: CombatState,
    ) -> CombatState {
        let factor = self.config.interpolation_factor;
        
        // Interpolate player position
        let mut result = backend.clone();
        result.player.position = Self::lerp_vector3(
            &predicted.player.position,
            &backend.player.position,
            factor
        );
        
        // Interpolate boss position
        result.boss.position = Self::lerp_vector3(
            &predicted.boss.position,
            &backend.boss.position,
            factor
        );
        
        result
    }
    
    /// # Responsibility
    /// Linear interpolation between two Vector3 values.
    fn lerp_vector3(a: &Vector3, b: &Vector3, t: f32) -> Vector3 {
        Vector3 {
            x: Self::lerp(a.x, b.x, t),
            y: Self::lerp(a.y, b.y, t),
            z: Self::lerp(a.z, b.z, t),
        }
    }
    
    /// # Responsibility
    /// Linear interpolation between two f32 values.
    fn lerp(a: f32, b: f32, t: f32) -> f32 {
        a + (b - a) * t
    }
    
    /// # Responsibility
    /// Merges qualia state (backend is always authoritative).
    pub fn merge_qualia_state(
        &self,
        backend: QualiaState,
        _frontend_predicted: Option<QualiaState>,
    ) -> QualiaState {
        // Qualia state is always backend-authoritative (calculated server-side)
        // No interpolation needed - immediate update
        backend
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
    
    fn create_test_service() -> StateMergerService {
        let config = StateMergerConfig::default();
        let logger = Arc::new(MockLogger);
        StateMergerService::new(config, logger)
    }
    
    fn create_test_combat_state(pos_x: f32, pos_y: f32, health: f32) -> CombatState {
        let mut state = CombatState::default();
        state.player.position = Vector3::new(pos_x, pos_y, 0.0);
        state.player.health = health;
        state
    }
    
    #[test]
    fn test_state_merger_creation() {
        let service = create_test_service();
        assert_eq!(service.config.interpolation_factor, 0.3);
        assert_eq!(service.config.teleport_threshold, 5.0);
    }
    
    #[test]
    fn test_merge_without_prediction() {
        let service = create_test_service();
        let backend = create_test_combat_state(10.0, 10.0, 100.0);
        
        let merged = service.merge_combat_state(backend.clone(), None);
        
        assert_eq!(merged.player.position.x, 10.0);
        assert_eq!(merged.player.position.y, 10.0);
    }
    
    #[test]
    fn test_interpolation_toward_backend() {
        let service = create_test_service();
        
        let backend = create_test_combat_state(10.0, 10.0, 100.0);
        let predicted = create_test_combat_state(8.0, 8.0, 95.0);
        
        let merged = service.merge_combat_state(backend, Some(predicted));
        
        // Should interpolate 30% toward backend: 8 + (10-8)*0.3 = 8.6
        assert_eq!(merged.player.position.x, 8.6);
        assert_eq!(merged.player.position.y, 8.6);
        
        // Health is always backend-authoritative
        assert_eq!(merged.player.health, 100.0);
    }
    
    #[test]
    fn test_teleport_on_large_divergence() {
        let service = create_test_service();
        
        let backend = create_test_combat_state(10.0, 10.0, 100.0);
        let predicted = create_test_combat_state(0.0, 0.0, 100.0); // 14.14 units away
        
        let merged = service.merge_combat_state(backend, Some(predicted));
        
        // Should teleport to backend state (no interpolation)
        assert_eq!(merged.player.position.x, 10.0);
        assert_eq!(merged.player.position.y, 10.0);
    }
    
    #[test]
    fn test_lerp_function() {
        assert_eq!(StateMergerService::lerp(0.0, 10.0, 0.0), 0.0);
        assert_eq!(StateMergerService::lerp(0.0, 10.0, 0.5), 5.0);
        assert_eq!(StateMergerService::lerp(0.0, 10.0, 1.0), 10.0);
        assert_eq!(StateMergerService::lerp(5.0, 15.0, 0.3), 8.0);
    }
    
    #[test]
    fn test_qualia_state_always_backend() {
        let service = create_test_service();
        
        let backend_qualia = QualiaState {
            intensity: 0.8,
            precision: 0.6,
            ..Default::default()
        };
        
        let predicted_qualia = QualiaState {
            intensity: 0.5,
            precision: 0.5,
            ..Default::default()
        };
        
        let merged = service.merge_qualia_state(backend_qualia, Some(predicted_qualia));
        
        // Should use backend values directly
        assert_eq!(merged.intensity, 0.8);
        assert_eq!(merged.precision, 0.6);
    }
}
