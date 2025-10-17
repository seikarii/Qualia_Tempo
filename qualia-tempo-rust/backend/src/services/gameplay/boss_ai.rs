//! # Responsibility
//! Boss AI service with phase-based difficulty scaling.

use async_trait::async_trait;
use shaku::Component;
use std::sync::{Arc, RwLock};
use anyhow::Result;

use shared_core::contracts::QualiaState;
use shared_core::traits::ILogger;
use crate::config::BossAIConfig;
use super::traits::{IBossAI, BossPhase};

/// # Responsibility
/// Manages boss AI behavior with phase transitions and difficulty scaling.
///
/// ---
///
/// Per GDD.md: Boss difficulty scales with song progress and player combo.
/// Phase transitions occur at configured thresholds. Aggression and telegraph
/// duration dynamically adjust based on current phase and player performance.
#[derive(Component)]
#[shaku(interface = IBossAI)]
pub struct BossAIService {
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,
    
    /// Current boss phase
    phase: Arc<RwLock<BossPhase>>,
    
    /// Current aggression level (0.0-1.0)
    aggression: Arc<RwLock<f32>>,
    
    /// Boss AI configuration
    config: Arc<BossAIConfig>,
}

impl BossAIService {
    /// Create a new BossAIService (called by Shaku).
    pub fn new(logger: Arc<dyn ILogger>) -> Self {
        let config = Arc::new(BossAIConfig::default());
        
        Self {
            logger,
            phase: Arc::new(RwLock::new(BossPhase::Intro)),
            aggression: Arc::new(RwLock::new(config.base_aggression_level)),
            config,
        }
    }
    
    /// Determine boss phase from song progress percentage.
    fn calculate_phase(&self, song_progress: f32) -> BossPhase {
        let [intro_end, standard_end, intensified_end] = self.config.phase_thresholds;
        
        if song_progress < intro_end {
            BossPhase::Intro
        } else if song_progress < standard_end {
            BossPhase::Standard
        } else if song_progress < intensified_end {
            BossPhase::Intensified
        } else {
            BossPhase::Final
        }
    }
    
    /// Calculate aggression level based on phase and player combo.
    fn calculate_aggression(&self, phase: BossPhase, player_combo: u32) -> f32 {
        // Base aggression from phase
        let phase_aggression = match phase {
            BossPhase::Intro => self.config.base_aggression_level * 0.5,
            BossPhase::Standard => self.config.base_aggression_level,
            BossPhase::Intensified => self.config.base_aggression_level * 1.5,
            BossPhase::Final => self.config.base_aggression_level * 2.0,
        };
        
        // Add combo-based aggression boost
        let combo_boost = player_combo as f32 * self.config.combo_aggression_multiplier;
        
        // Clamp to [0.0, 1.0]
        (phase_aggression + combo_boost).clamp(0.0, 1.0)
    }
}

#[async_trait]
impl IBossAI for BossAIService {
    async fn update(&self, song_progress: f32, qualia: QualiaState) -> Result<bool> {
        // Calculate new phase
        let new_phase = self.calculate_phase(song_progress);
        
        // Check if phase changed
        let phase_changed = {
            let current = *self.phase.read().unwrap();
            if current != new_phase {
                *self.phase.write().unwrap() = new_phase;
                self.logger.info(&format!(
                    "Boss phase transition: {:?} -> {:?} (song progress: {:.1}%)",
                    current, new_phase, song_progress * 100.0
                ));
                true
            } else {
                false
            }
        };
        
        // Calculate and update aggression
        let new_aggression = self.calculate_aggression(new_phase, qualia.combo);
        *self.aggression.write().unwrap() = new_aggression;
        
        self.logger.debug(&format!(
            "Boss AI update - Phase: {:?}, Aggression: {:.2}, Combo: {}",
            new_phase, new_aggression, qualia.combo
        ));
        
        Ok(phase_changed)
    }
    
    fn current_phase(&self) -> BossPhase {
        *self.phase.read().unwrap()
    }
    
    fn current_aggression(&self) -> f32 {
        *self.aggression.read().unwrap()
    }
    
    fn calculate_telegraph_duration(&self) -> u64 {
        let aggression = self.current_aggression();
        
        // Interpolate between base and min duration based on aggression
        let base = self.config.telegraph_base_duration_ms as f32;
        let min = self.config.telegraph_min_duration_ms as f32;
        
        // Higher aggression = shorter telegraph
        let duration = base - (aggression * (base - min));
        
        duration.max(min) as u64
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use shared_core::traits::ILogger;
    use mockall::mock;

    mock! {
        Logger {}
        impl ILogger for Logger {
            fn info(&self, message: &str);
            fn warn(&self, message: &str);
            fn error(&self, message: &str);
            fn debug(&self, message: &str);
        }
    }

    fn create_boss_ai() -> BossAIService {
        let mut mock_logger = MockLogger::new();
        mock_logger.expect_info().returning(|_| ());
        mock_logger.expect_debug().returning(|_| ());
        
        BossAIService::new(Arc::new(mock_logger))
    }

    #[tokio::test]
    async fn test_initial_phase_is_intro() {
        let boss_ai = create_boss_ai();
        
        assert_eq!(boss_ai.current_phase(), BossPhase::Intro);
    }

    #[tokio::test]
    async fn test_phase_transitions_at_thresholds() {
        let boss_ai = create_boss_ai();
        let qualia = QualiaState::default();
        
        // Intro phase (0-15%)
        boss_ai.update(0.10, qualia).await.unwrap();
        assert_eq!(boss_ai.current_phase(), BossPhase::Intro);
        
        // Transition to Standard (15-50%)
        let changed = boss_ai.update(0.20, qualia).await.unwrap();
        assert!(changed, "Should detect phase change");
        assert_eq!(boss_ai.current_phase(), BossPhase::Standard);
        
        // Transition to Intensified (50-85%)
        let changed = boss_ai.update(0.60, qualia).await.unwrap();
        assert!(changed, "Should detect phase change");
        assert_eq!(boss_ai.current_phase(), BossPhase::Intensified);
        
        // Transition to Final (85-100%)
        let changed = boss_ai.update(0.90, qualia).await.unwrap();
        assert!(changed, "Should detect phase change");
        assert_eq!(boss_ai.current_phase(), BossPhase::Final);
    }

    #[tokio::test]
    async fn test_no_phase_change_within_same_range() {
        let boss_ai = create_boss_ai();
        let qualia = QualiaState::default();
        
        boss_ai.update(0.20, qualia).await.unwrap();
        assert_eq!(boss_ai.current_phase(), BossPhase::Standard);
        
        // Move within same phase
        let changed = boss_ai.update(0.30, qualia).await.unwrap();
        assert!(!changed, "Should not detect phase change within same range");
        assert_eq!(boss_ai.current_phase(), BossPhase::Standard);
    }

    #[tokio::test]
    async fn test_aggression_scales_with_phase() {
        let boss_ai = create_boss_ai();
        let qualia = QualiaState::default();
        
        // Intro: 50% of base
        boss_ai.update(0.10, qualia).await.unwrap();
        let intro_aggression = boss_ai.current_aggression();
        assert!(intro_aggression < 0.3, "Intro should have low aggression");
        
        // Standard: 100% of base
        boss_ai.update(0.30, qualia).await.unwrap();
        let standard_aggression = boss_ai.current_aggression();
        assert!(standard_aggression > intro_aggression, "Standard should be more aggressive");
        
        // Intensified: 150% of base
        boss_ai.update(0.70, qualia).await.unwrap();
        let intensified_aggression = boss_ai.current_aggression();
        assert!(intensified_aggression > standard_aggression, "Intensified should be more aggressive");
        
        // Final: 200% of base (clamped to 1.0)
        boss_ai.update(0.95, qualia).await.unwrap();
        let final_aggression = boss_ai.current_aggression();
        assert!(final_aggression > intensified_aggression, "Final should be most aggressive");
    }

    #[tokio::test]
    async fn test_combo_increases_aggression() {
        let boss_ai = create_boss_ai();
        
        let low_combo_qualia = QualiaState {
            combo: 5,
            ..Default::default()
        };
        
        let high_combo_qualia = QualiaState {
            combo: 50,
            ..Default::default()
        };
        
        // Same phase, different combos
        boss_ai.update(0.30, low_combo_qualia).await.unwrap();
        let low_combo_aggression = boss_ai.current_aggression();
        
        boss_ai.update(0.30, high_combo_qualia).await.unwrap();
        let high_combo_aggression = boss_ai.current_aggression();
        
        assert!(high_combo_aggression > low_combo_aggression, 
                "Higher combo should increase aggression");
    }

    #[tokio::test]
    async fn test_telegraph_duration_decreases_with_aggression() {
        let boss_ai = create_boss_ai();
        let qualia = QualiaState::default();
        
        // Low aggression (Intro)
        boss_ai.update(0.10, qualia).await.unwrap();
        let intro_duration = boss_ai.calculate_telegraph_duration();
        
        // High aggression (Final)
        boss_ai.update(0.95, qualia).await.unwrap();
        let final_duration = boss_ai.calculate_telegraph_duration();
        
        assert!(final_duration < intro_duration, 
                "Higher aggression should result in shorter telegraphs");
        assert!(final_duration >= 300, 
                "Telegraph duration should not go below minimum");
    }

    #[tokio::test]
    async fn test_aggression_clamped_to_valid_range() {
        let boss_ai = create_boss_ai();
        
        // Extreme combo to test clamping
        let extreme_qualia = QualiaState {
            combo: 1000,
            ..Default::default()
        };
        
        boss_ai.update(0.95, extreme_qualia).await.unwrap();
        let aggression = boss_ai.current_aggression();
        
        assert!(aggression >= 0.0 && aggression <= 1.0, 
                "Aggression should be clamped to [0.0, 1.0]");
    }

    #[tokio::test]
    async fn test_phase_calculation_boundary_values() {
        let boss_ai = create_boss_ai();
        
        // Exact threshold values
        assert_eq!(boss_ai.calculate_phase(0.149), BossPhase::Intro);
        assert_eq!(boss_ai.calculate_phase(0.150), BossPhase::Standard);
        assert_eq!(boss_ai.calculate_phase(0.499), BossPhase::Standard);
        assert_eq!(boss_ai.calculate_phase(0.500), BossPhase::Intensified);
        assert_eq!(boss_ai.calculate_phase(0.849), BossPhase::Intensified);
        assert_eq!(boss_ai.calculate_phase(0.850), BossPhase::Final);
        assert_eq!(boss_ai.calculate_phase(1.000), BossPhase::Final);
    }
}
