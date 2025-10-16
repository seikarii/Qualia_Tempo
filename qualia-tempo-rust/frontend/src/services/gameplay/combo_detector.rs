//! # Responsibility
//! Detects and validates musical combos from player input sequences.
//!
//! ---
//!
//! Subscribes to PlayerActionValidated events, tracks input history,
//! matches against combo patterns, and emits ComboDetected events.
//! Integrates with the harmonic combo system from GDD v2.0.

use std::sync::{Arc, Mutex};
use std::collections::VecDeque;
use shared_core::{GameEvent, PlayerAction};
use crate::services::core::{ILogger, IEventBus};

/// # Responsibility
/// Configuration for combo detection.
#[derive(Debug, Clone)]
pub struct ComboDetectorConfig {
    /// Maximum time window for combo completion (seconds)
    pub combo_window_sec: f64,
    
    /// Minimum accuracy required for combo inputs (0.0-1.0)
    pub min_accuracy: f32,
    
    /// Maximum input history size (prevents unbounded growth)
    pub max_history_size: usize,
    
    /// Whether to log combo detections
    pub enable_logging: bool,
}

impl Default for ComboDetectorConfig {
    fn default() -> Self {
        Self {
            combo_window_sec: 3.0,
            min_accuracy: 0.5,
            max_history_size: 20,
            enable_logging: true,
        }
    }
}

/// # Responsibility
/// Represents a combo pattern (sequence of keys that trigger an effect).
///
/// ---
///
/// From GDD.md §3.7: Combos are emergent from multiple sources:
/// - Key presses (Q, E, R, T, F, G, C)
/// - Qualia collection timing
/// - Rhythmic accuracy
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct ComboPattern {
    /// Sequence of key names (e.g., ["Q", "E", "R"] for Remolino)
    pub keys: Vec<String>,
    
    /// Combo name (e.g., "Remolino", "Atractor")
    pub name: String,
    
    /// Whether this combo is beneficial (true) or chaotic (false)
    pub is_beneficial: bool,
    
    /// Effect description
    pub effect: String,
}

impl ComboPattern {
    /// # Responsibility
    /// Creates a new combo pattern.
    pub fn new(keys: Vec<String>, name: String, is_beneficial: bool, effect: String) -> Self {
        Self {
            keys,
            name,
            is_beneficial,
            effect,
        }
    }
}

/// # Responsibility
/// Tracks a single input in the combo history.
#[derive(Debug, Clone)]
struct ComboInput {
    key: String,
    accuracy: f32,
    timestamp: f64, // seconds since some reference point
}

/// # Responsibility
/// Detects combos from player input sequences.
///
/// ---
///
/// Listens to PlayerActionValidated events, maintains input history,
/// and matches against known combo patterns. Emits ComboDetected event
/// when a valid combo is found.
pub struct ComboDetectorService {
    config: ComboDetectorConfig,
    logger: Arc<dyn ILogger>,
    event_bus: Arc<dyn IEventBus>,
    
    // Combo patterns (from GDD §3.7)
    beneficial_patterns: Vec<ComboPattern>,
    chaotic_patterns: Vec<ComboPattern>,
    
    // Input tracking
    input_history: Arc<Mutex<VecDeque<ComboInput>>>,
}

impl ComboDetectorService {
    /// # Responsibility
    /// Creates new combo detector with dependencies.
    pub fn new(
        config: ComboDetectorConfig,
        logger: Arc<dyn ILogger>,
        event_bus: Arc<dyn IEventBus>,
    ) -> Self {
        let beneficial_patterns = Self::load_beneficial_patterns();
        let chaotic_patterns = Self::load_chaotic_patterns();
        
        Self {
            config,
            logger,
            event_bus,
            beneficial_patterns,
            chaotic_patterns,
            input_history: Arc::new(Mutex::new(VecDeque::new())),
        }
    }
    
    /// # Responsibility
    /// Starts combo detector (subscribes to PlayerActionValidated events).
    pub fn start(&self) {
        self.logger.info("ComboDetector started");
        
        let event_bus = self.event_bus.clone();
        let input_history = self.input_history.clone();
        let config = self.config.clone();
        let logger = self.logger.clone();
        let beneficial = self.beneficial_patterns.clone();
        let chaotic = self.chaotic_patterns.clone();
        
        // Subscribe to PlayerActionValidated events
        tokio::spawn(async move {
            let mut events = event_bus.subscribe();
            
            loop {
                match events.recv().await {
                    Ok(GameEvent::PlayerActionValidated { action, accuracy, .. }) => {
                        Self::handle_validated_action(
                            &action,
                            accuracy,
                            &input_history,
                            &config,
                            &logger,
                            &beneficial,
                            &chaotic,
                            &event_bus,
                        );
                    }
                    Err(_) => break, // EventBus closed
                    _ => {}
                }
            }
        });
    }
    
    /// # Responsibility
    /// Handles a validated player action (processes combo logic).
    fn handle_validated_action(
        action: &PlayerAction,
        accuracy: f32,
        input_history: &Arc<Mutex<VecDeque<ComboInput>>>,
        config: &ComboDetectorConfig,
        logger: &Arc<dyn ILogger>,
        beneficial: &[ComboPattern],
        chaotic: &[ComboPattern],
        event_bus: &Arc<dyn IEventBus>,
    ) {
        // Only track KeyPressed actions with sufficient accuracy
        if accuracy < config.min_accuracy {
            return;
        }
        
        // Extract key name from action
        let key_name = match action {
            PlayerAction::KeyPressed { key, .. } => key.to_string(),
            PlayerAction::Dash { .. } => "Space".to_string(),
            _ => return,
        };
        
        // Add to history
        let mut history = input_history.lock().unwrap();
        
        let now = web_sys::window()
            .and_then(|w| w.performance())
            .map(|p| p.now() / 1000.0)
            .unwrap_or(0.0);
        
        history.push_back(ComboInput {
            key: key_name,
            accuracy,
            timestamp: now,
        });
        
        // Limit history size
        while history.len() > config.max_history_size {
            history.pop_front();
        }
        
        // Prune old entries outside combo window
        while let Some(front) = history.front() {
            if now - front.timestamp > config.combo_window_sec {
                history.pop_front();
            } else {
                break;
            }
        }
        
        // Check for combo matches
        let recent_keys: Vec<String> = history.iter().map(|i| i.key.clone()).collect();
        
        // Check beneficial combos first
        for pattern in beneficial {
            if Self::matches_pattern(&recent_keys, &pattern.keys) {
                if config.enable_logging {
                    logger.info(&format!("Beneficial combo detected: {}", pattern.name));
                }
                
                // Emit ComboDetected event
                // TODO: Define ComboDetectedEvent in shared_core
                // event_bus.emit(GameEvent::ComboDetected { ... }).ok();
                
                // Clear history to prevent duplicate detections
                history.clear();
                return;
            }
        }
        
        // Check chaotic combos
        for pattern in chaotic {
            if Self::matches_pattern(&recent_keys, &pattern.keys) {
                if config.enable_logging {
                    logger.warn(&format!("Chaotic combo detected: {}", pattern.name));
                }
                
                // Emit ComboDetected event
                // event_bus.emit(GameEvent::ComboDetected { ... }).ok();
                
                // Clear history
                history.clear();
                return;
            }
        }
    }
    
    /// # Responsibility
    /// Checks if recent input matches a combo pattern.
    ///
    /// ---
    ///
    /// Matches if pattern keys appear in order at the end of recent_keys.
    fn matches_pattern(recent_keys: &[String], pattern_keys: &[String]) -> bool {
        if recent_keys.len() < pattern_keys.len() {
            return false;
        }
        
        let start_idx = recent_keys.len() - pattern_keys.len();
        &recent_keys[start_idx..] == pattern_keys
    }
    
    /// # Responsibility
    /// Loads beneficial combo patterns from GDD §3.7.
    fn load_beneficial_patterns() -> Vec<ComboPattern> {
        vec![
            ComboPattern::new(
                vec!["Q".to_string(), "E".to_string(), "R".to_string()],
                "Remolino".to_string(),
                true,
                "Control de área, atrae Qualia cercano".to_string(),
            ),
            ComboPattern::new(
                vec!["Q".to_string(), "R".to_string(), "F".to_string()],
                "Atractor".to_string(),
                true,
                "Recolección masiva de Qualia en radio".to_string(),
            ),
            ComboPattern::new(
                vec!["T".to_string(), "E".to_string(), "R".to_string()],
                "Repulsor".to_string(),
                true,
                "Defensa, repele ataques del boss".to_string(),
            ),
            ComboPattern::new(
                vec!["Q".to_string(), "E".to_string(), "T".to_string()],
                "Multiplicador".to_string(),
                true,
                "Multiplicador de combo (+50% puntuación temporal)".to_string(),
            ),
            ComboPattern::new(
                vec!["F".to_string(), "G".to_string(), "C".to_string()],
                "Curación".to_string(),
                true,
                "Restaura vida gradualmente".to_string(),
            ),
            ComboPattern::new(
                vec!["Q".to_string(), "E".to_string(), "R".to_string(), "T".to_string(), "F".to_string(), "G".to_string(), "C".to_string()],
                "Escala Completa".to_string(),
                true,
                "Curación completa + escudo temporal".to_string(),
            ),
        ]
    }
    
    /// # Responsibility
    /// Loads chaotic combo patterns from GDD §3.7.
    fn load_chaotic_patterns() -> Vec<ComboPattern> {
        vec![
            ComboPattern::new(
                vec!["Q".to_string(), "T".to_string(), "G".to_string()],
                "Muro Sonoro".to_string(),
                false,
                "Bloquea movimiento en área".to_string(),
            ),
            ComboPattern::new(
                vec!["E".to_string(), "F".to_string(), "C".to_string()],
                "Zona de Daño".to_string(),
                false,
                "Daño por segundo en área circular".to_string(),
            ),
            ComboPattern::new(
                vec!["R".to_string(), "G".to_string(), "T".to_string()],
                "Repulsor Inverso".to_string(),
                false,
                "Empuja al jugador hacia el boss".to_string(),
            ),
            ComboPattern::new(
                vec!["Q".to_string(), "G".to_string(), "C".to_string()],
                "Atractor Hostil".to_string(),
                false,
                "Atrae al boss hacia el jugador".to_string(),
            ),
            ComboPattern::new(
                vec!["T".to_string(), "F".to_string(), "R".to_string()],
                "Interferencia Auditiva".to_string(),
                false,
                "Reduce precisión de recolección".to_string(),
            ),
        ]
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::tests::mocks::{MockLogger, MockEventBus};
    
    fn create_test_service() -> ComboDetectorService {
        let config = ComboDetectorConfig::default();
        let logger = Arc::new(MockLogger);
        let event_bus = Arc::new(MockEventBus::new());
        
        ComboDetectorService::new(config, logger, event_bus)
    }
    
    #[test]
    fn test_combo_detector_creation() {
        let service = create_test_service();
        
        assert_eq!(service.beneficial_patterns.len(), 6);
        assert_eq!(service.chaotic_patterns.len(), 5);
        assert_eq!(service.config.combo_window_sec, 3.0);
    }
    
    #[test]
    fn test_matches_pattern_exact_match() {
        let recent = vec!["Q".to_string(), "E".to_string(), "R".to_string()];
        let pattern = vec!["Q".to_string(), "E".to_string(), "R".to_string()];
        
        assert!(ComboDetectorService::matches_pattern(&recent, &pattern));
    }
    
    #[test]
    fn test_matches_pattern_suffix_match() {
        let recent = vec!["F".to_string(), "Q".to_string(), "E".to_string(), "R".to_string()];
        let pattern = vec!["Q".to_string(), "E".to_string(), "R".to_string()];
        
        assert!(ComboDetectorService::matches_pattern(&recent, &pattern));
    }
    
    #[test]
    fn test_matches_pattern_no_match() {
        let recent = vec!["Q".to_string(), "T".to_string(), "R".to_string()];
        let pattern = vec!["Q".to_string(), "E".to_string(), "R".to_string()];
        
        assert!(!ComboDetectorService::matches_pattern(&recent, &pattern));
    }
    
    #[test]
    fn test_matches_pattern_too_short() {
        let recent = vec!["Q".to_string(), "E".to_string()];
        let pattern = vec!["Q".to_string(), "E".to_string(), "R".to_string()];
        
        assert!(!ComboDetectorService::matches_pattern(&recent, &pattern));
    }
    
    #[test]
    fn test_load_beneficial_patterns() {
        let patterns = ComboDetectorService::load_beneficial_patterns();
        
        assert_eq!(patterns.len(), 6);
        assert!(patterns.iter().all(|p| p.is_beneficial));
        assert!(patterns.iter().any(|p| p.name == "Remolino"));
        assert!(patterns.iter().any(|p| p.name == "Escala Completa"));
    }
    
    #[test]
    fn test_load_chaotic_patterns() {
        let patterns = ComboDetectorService::load_chaotic_patterns();
        
        assert_eq!(patterns.len(), 5);
        assert!(patterns.iter().all(|p| !p.is_beneficial));
        assert!(patterns.iter().any(|p| p.name == "Muro Sonoro"));
        assert!(patterns.iter().any(|p| p.name == "Interferencia Auditiva"));
    }
}
