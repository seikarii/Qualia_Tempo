//! # Responsibility
//! Manages boss attack patterns with loading, validation, and procedural generation.
//!
//! ---
//!
//! This service provides pattern data for boss attacks. It supports:
//! - Loading patterns from YAML/JSON configuration files
//! - Pattern validation (required_phase, timing, damage ranges)
//! - Caching for performance
//! - Procedural pattern generation for variety
//! - Pattern queries by phase, element, difficulty

use shaku::{Component, Interface};
use std::sync::Arc;
use async_trait::async_trait;
use anyhow::{Result, Context};
use std::collections::HashMap;
use tokio::sync::RwLock;
use shared_core::contracts::combat_data::{PatternData, PatternShape, PatternElement};
use crate::services::infrastructure::ILogger;

/// # Responsibility
/// Configuration for pattern system behavior.
#[derive(Debug, Clone)]
pub struct PatternSystemConfig {
    pub patterns_path: String,
    pub enable_procedural_generation: bool,
    pub cache_capacity: usize,
}

impl Default for PatternSystemConfig {
    fn default() -> Self {
        Self {
            patterns_path: "config/patterns.yaml".to_string(),
            enable_procedural_generation: true,
            cache_capacity: 100,
        }
    }
}

/// # Responsibility
/// Interface for pattern system operations.
#[async_trait]
pub trait IPatternSystemService: Interface {
    /// Loads all patterns from configuration
    async fn load_patterns(&self) -> Result<usize>;
    
    /// Gets a pattern by ID
    async fn get_pattern(&self, pattern_id: &str) -> Option<PatternData>;
    
    /// Gets all patterns for a specific boss phase
    async fn get_patterns_for_phase(&self, phase: u8) -> Vec<PatternData>;
    
    /// Generates a procedural pattern
    fn generate_procedural_pattern(&self, phase: u8, element: PatternElement, difficulty: f32) -> PatternData;
    
    /// Validates a pattern's data integrity
    fn validate_pattern(&self, pattern: &PatternData) -> Result<()>;
}

/// # Responsibility
/// Implements pattern loading, caching, and generation.
#[derive(Component)]
#[shaku(interface = IPatternSystemService)]
pub struct PatternSystemService {
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,
    
    config: Arc<PatternSystemConfig>,
    
    /// Pattern cache: pattern_id -> PatternData
    cache: Arc<RwLock<HashMap<String, PatternData>>>,
}

impl PatternSystemService {
    /// Creates hardcoded patterns for initial implementation
    fn create_default_patterns(&self) -> Vec<PatternData> {
        vec![
            // Phase 0: Fire patterns
            PatternData {
                id: "fire_circle_easy".to_string(),
                name: "Ember Ring".to_string(),
                shape: PatternShape::Circle,
                element: PatternElement::Fire,
                duration_sec: 3.0,
                telegraph_duration_sec: 1.0,
                projectile_count: 8,
                projectile_speed: 5.0,
                damage: 10.0,
                required_phase: 0,
            },
            PatternData {
                id: "fire_wave_medium".to_string(),
                name: "Flame Wave".to_string(),
                shape: PatternShape::Wave,
                element: PatternElement::Fire,
                duration_sec: 4.0,
                telegraph_duration_sec: 0.8,
                projectile_count: 12,
                projectile_speed: 7.0,
                damage: 15.0,
                required_phase: 0,
            },
            
            // Phase 1: Lightning patterns
            PatternData {
                id: "lightning_spiral_medium".to_string(),
                name: "Thunder Spiral".to_string(),
                shape: PatternShape::Spiral,
                element: PatternElement::Lightning,
                duration_sec: 3.5,
                telegraph_duration_sec: 0.7,
                projectile_count: 16,
                projectile_speed: 10.0,
                damage: 20.0,
                required_phase: 1,
            },
            PatternData {
                id: "lightning_cross_hard".to_string(),
                name: "Lightning Cross".to_string(),
                shape: PatternShape::Cross,
                element: PatternElement::Lightning,
                duration_sec: 2.5,
                telegraph_duration_sec: 0.5,
                projectile_count: 20,
                projectile_speed: 12.0,
                damage: 25.0,
                required_phase: 1,
            },
            
            // Phase 2: Void patterns
            PatternData {
                id: "void_spiral_hard".to_string(),
                name: "Void Vortex".to_string(),
                shape: PatternShape::Spiral,
                element: PatternElement::Void,
                duration_sec: 5.0,
                telegraph_duration_sec: 0.6,
                projectile_count: 24,
                projectile_speed: 8.0,
                damage: 30.0,
                required_phase: 2,
            },
            PatternData {
                id: "void_circle_extreme".to_string(),
                name: "Void Nova".to_string(),
                shape: PatternShape::Circle,
                element: PatternElement::Void,
                duration_sec: 3.0,
                telegraph_duration_sec: 0.4,
                projectile_count: 32,
                projectile_speed: 15.0,
                damage: 35.0,
                required_phase: 2,
            },
            
            // Phase 3: Chaos patterns
            PatternData {
                id: "chaos_random_extreme".to_string(),
                name: "Chaos Storm".to_string(),
                shape: PatternShape::Random,
                element: PatternElement::Chaos,
                duration_sec: 6.0,
                telegraph_duration_sec: 0.3,
                projectile_count: 40,
                projectile_speed: 12.0,
                damage: 40.0,
                required_phase: 3,
            },
        ]
    }
}

#[async_trait]
impl IPatternSystemService for PatternSystemService {
    async fn load_patterns(&self) -> Result<usize> {
        self.logger.info("Loading attack patterns");
        
        // For initial implementation, use hardcoded patterns
        let patterns = self.create_default_patterns();
        
        // Validate all patterns
        for pattern in &patterns {
            self.validate_pattern(pattern)
                .context(format!("Pattern validation failed for: {}", pattern.id))?;
        }
        
        // Cache all patterns
        let mut cache = self.cache.write().await;
        for pattern in patterns {
            cache.insert(pattern.id.clone(), pattern);
        }
        
        let count = cache.len();
        self.logger.info(&format!("Loaded {} attack patterns", count));
        
        Ok(count)
    }
    
    async fn get_pattern(&self, pattern_id: &str) -> Option<PatternData> {
        let cache = self.cache.read().await;
        cache.get(pattern_id).cloned()
    }
    
    async fn get_patterns_for_phase(&self, phase: u8) -> Vec<PatternData> {
        let cache = self.cache.read().await;
        cache.values()
            .filter(|p| p.required_phase == phase)
            .cloned()
            .collect()
    }
    
    fn generate_procedural_pattern(&self, phase: u8, element: PatternElement, difficulty: f32) -> PatternData {
        // Generate unique ID
        let id = format!("proc_{}_{:?}_{}",
            phase,
            element,
            (difficulty * 100.0) as u32
        );
        
        // Select shape based on difficulty
        let shape = if difficulty > 0.8 {
            PatternShape::Random
        } else if difficulty > 0.6 {
            PatternShape::Spiral
        } else if difficulty > 0.4 {
            PatternShape::Wave
        } else if difficulty > 0.2 {
            PatternShape::Cross
        } else {
            PatternShape::Circle
        };
        
        // Scale parameters by difficulty
        let base_projectiles = 8;
        let projectile_count = base_projectiles + (difficulty * 32.0) as u32;
        let projectile_speed = 5.0 + (difficulty * 10.0);
        let damage = 10.0 + (difficulty * 30.0);
        let telegraph_duration = 1.0 - (difficulty * 0.6);
        
        PatternData {
            id,
            name: format!("{:?} {:?} (Procedural)", element, shape),
            shape,
            element,
            duration_sec: 3.0 + (difficulty * 3.0) as f64,
            telegraph_duration_sec: telegraph_duration as f64,
            projectile_count,
            projectile_speed,
            damage,
            required_phase: phase,
        }
    }
    
    fn validate_pattern(&self, pattern: &PatternData) -> Result<()> {
        // Validate required_phase
        if pattern.required_phase > 3 {
            anyhow::bail!("Invalid required_phase: {} (must be 0-3)", pattern.required_phase);
        }
        
        // Validate durations
        if pattern.duration_sec <= 0.0 {
            anyhow::bail!("Invalid duration_sec: {} (must be > 0)", pattern.duration_sec);
        }
        
        if pattern.telegraph_duration_sec < 0.0 || pattern.telegraph_duration_sec > pattern.duration_sec {
            anyhow::bail!(
                "Invalid telegraph_duration_sec: {} (must be 0 <= x <= duration)",
                pattern.telegraph_duration_sec
            );
        }
        
        // Validate projectile count
        if pattern.projectile_count == 0 || pattern.projectile_count > 100 {
            anyhow::bail!(
                "Invalid projectile_count: {} (must be 1-100)",
                pattern.projectile_count
            );
        }
        
        // Validate projectile speed
        if pattern.projectile_speed <= 0.0 || pattern.projectile_speed > 50.0 {
            anyhow::bail!(
                "Invalid projectile_speed: {} (must be 0 < x <= 50)",
                pattern.projectile_speed
            );
        }
        
        // Validate damage
        if pattern.damage <= 0.0 || pattern.damage > 100.0 {
            anyhow::bail!("Invalid damage: {} (must be 0 < x <= 100)", pattern.damage);
        }
        
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::infrastructure::QualiaLogger;

    fn create_test_service() -> PatternSystemService {
        let logger = Arc::new(QualiaLogger) as Arc<dyn ILogger>;
        let config = Arc::new(PatternSystemConfig::default());
        let cache = Arc::new(RwLock::new(HashMap::new()));
        
        PatternSystemService {
            logger,
            config,
            cache,
        }
    }

    #[tokio::test]
    async fn test_load_patterns_success() {
        let service = create_test_service();
        
        let result = service.load_patterns().await;
        assert!(result.is_ok(), "Pattern loading should succeed");
        
        let count = result.unwrap();
        assert!(count > 0, "Should load at least one pattern");
    }

    #[tokio::test]
    async fn test_get_pattern_by_id() {
        let service = create_test_service();
        service.load_patterns().await.unwrap();
        
        let pattern = service.get_pattern("fire_circle_easy").await;
        assert!(pattern.is_some(), "Should find fire_circle_easy pattern");
        
        let pattern = pattern.unwrap();
        assert_eq!(pattern.element, PatternElement::Fire);
        assert_eq!(pattern.required_phase, 0);
    }

    #[tokio::test]
    async fn test_get_patterns_for_phase() {
        let service = create_test_service();
        service.load_patterns().await.unwrap();
        
        let phase0_patterns = service.get_patterns_for_phase(0).await;
        assert!(!phase0_patterns.is_empty(), "Phase 0 should have patterns");
        
        // All returned patterns should be for phase 0
        for pattern in &phase0_patterns {
            assert_eq!(pattern.required_phase, 0, "All patterns should be for phase 0");
        }
        
        let phase1_patterns = service.get_patterns_for_phase(1).await;
        assert!(!phase1_patterns.is_empty(), "Phase 1 should have patterns");
    }

    #[tokio::test]
    async fn test_generate_procedural_pattern() {
        let service = create_test_service();
        
        // Generate easy pattern
        let easy_pattern = service.generate_procedural_pattern(0, PatternElement::Fire, 0.2);
        assert!(easy_pattern.projectile_count < 15, "Easy pattern should have few projectiles");
        assert!(easy_pattern.damage < 20.0, "Easy pattern should have low damage");
        
        // Generate hard pattern
        let hard_pattern = service.generate_procedural_pattern(2, PatternElement::Void, 0.9);
        assert!(hard_pattern.projectile_count > 30, "Hard pattern should have many projectiles");
        assert!(hard_pattern.damage > 30.0, "Hard pattern should have high damage");
        assert!(hard_pattern.telegraph_duration_sec < 0.5, "Hard pattern should have short telegraph");
    }

    #[test]
    fn test_validate_pattern_success() {
        let service = create_test_service();
        
        let valid_pattern = PatternData {
            id: "test".to_string(),
            name: "Test Pattern".to_string(),
            shape: PatternShape::Circle,
            element: PatternElement::Fire,
            duration_sec: 3.0,
            telegraph_duration_sec: 1.0,
            projectile_count: 10,
            projectile_speed: 8.0,
            damage: 15.0,
            required_phase: 1,
        };
        
        let result = service.validate_pattern(&valid_pattern);
        assert!(result.is_ok(), "Valid pattern should pass validation");
    }

    #[test]
    fn test_validate_pattern_invalid_phase() {
        let service = create_test_service();
        
        let invalid_pattern = PatternData {
            id: "test".to_string(),
            name: "Test".to_string(),
            shape: PatternShape::Circle,
            element: PatternElement::Fire,
            duration_sec: 3.0,
            telegraph_duration_sec: 1.0,
            projectile_count: 10,
            projectile_speed: 8.0,
            damage: 15.0,
            required_phase: 5, // Invalid!
        };
        
        let result = service.validate_pattern(&invalid_pattern);
        assert!(result.is_err(), "Should reject invalid phase");
    }

    #[test]
    fn test_validate_pattern_invalid_projectile_count() {
        let service = create_test_service();
        
        let invalid_pattern = PatternData {
            id: "test".to_string(),
            name: "Test".to_string(),
            shape: PatternShape::Circle,
            element: PatternElement::Fire,
            duration_sec: 3.0,
            telegraph_duration_sec: 1.0,
            projectile_count: 0, // Invalid!
            projectile_speed: 8.0,
            damage: 15.0,
            required_phase: 1,
        };
        
        let result = service.validate_pattern(&invalid_pattern);
        assert!(result.is_err(), "Should reject zero projectiles");
    }
}
