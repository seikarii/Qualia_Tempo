//! # Responsibility
//! Orchestrates the main gameplay loop and coordinates all gameplay systems.
//!
//! ---
//!
//! The GameController is the frontend's game loop coordinator, managing:
//! - Frame updates (60 FPS target)
//! - Event distribution to gameplay systems
//! - State synchronization with backend
//! - Timing and performance tracking

use std::sync::Arc;
use wasm_bindgen::JsCast;
use web_sys::{window, Performance};
use leptos::*;
use shared_core::{GameEvent, CombatState, PlayerAction};
use crate::services::core::{ILogger, IEventBus};
use crate::state::GameStateStore;

/// # Responsibility
/// Configuration for game controller.
#[derive(Debug, Clone)]
pub struct GameControllerConfig {
    /// Target frame rate (FPS)
    pub target_fps: f64,
    
    /// Whether to enable frame time logging
    pub enable_performance_logging: bool,
    
    /// Performance log interval (frames)
    pub log_interval_frames: u32,
}

impl Default for GameControllerConfig {
    fn default() -> Self {
        Self {
            target_fps: 60.0,
            enable_performance_logging: false,
            log_interval_frames: 300, // Log every 5 seconds at 60 FPS
        }
    }
}

/// # Responsibility
/// Manages the main gameplay loop and system coordination.
///
/// ---
///
/// The GameController runs at 60 FPS and:
/// 1. Updates game systems (input, physics, audio)
/// 2. Sends delta time to systems that need it
/// 3. Tracks performance metrics
/// 4. Coordinates with backend via WebSocket
pub struct GameControllerService {
    config: GameControllerConfig,
    logger: Arc<dyn ILogger>,
    event_bus: Arc<dyn IEventBus>,
    game_store: GameStateStore,
    
    // Performance tracking
    performance: Option<Performance>,
    last_frame_time: f64,
    frame_count: u32,
    accumulated_frame_time: f64,
    
    // Game loop state
    is_running: bool,
}

impl GameControllerService {
    /// # Responsibility
    /// Creates new game controller with dependencies.
    pub fn new(
        config: GameControllerConfig,
        logger: Arc<dyn ILogger>,
        event_bus: Arc<dyn IEventBus>,
        game_store: GameStateStore,
    ) -> Self {
        let performance = window()
            .and_then(|w| w.performance());
        
        let now = performance
            .as_ref()
            .map(|p| p.now())
            .unwrap_or(0.0);
        
        Self {
            config,
            logger,
            event_bus,
            game_store,
            performance,
            last_frame_time: now,
            frame_count: 0,
            accumulated_frame_time: 0.0,
            is_running: false,
        }
    }
    
    /// # Responsibility
    /// Starts the game loop using requestAnimationFrame.
    pub fn start(&mut self) {
        if self.is_running {
            self.logger.warn("GameController already running");
            return;
        }
        
        self.is_running = true;
        self.logger.info("GameController started");
        
        // Initialize frame timing
        if let Some(ref perf) = self.performance {
            self.last_frame_time = perf.now();
        }
        
        // Emit GameStarted event
        self.event_bus.emit(GameEvent::GameStarted).ok();
        
        // Start animation loop (actual loop setup done in Leptos component)
        // This method is called from the main app to initialize state
    }
    
    /// # Responsibility
    /// Stops the game loop.
    pub fn stop(&mut self) {
        if !self.is_running {
            return;
        }
        
        self.is_running = false;
        self.logger.info("GameController stopped");
        
        // Emit GamePaused event
        self.event_bus.emit(GameEvent::GamePaused).ok();
    }
    
    /// # Responsibility
    /// Updates the game state for one frame.
    ///
    /// ---
    ///
    /// Called every frame by requestAnimationFrame. Calculates delta time,
    /// emits FrameUpdate event, and tracks performance metrics.
    pub fn update(&mut self) {
        if !self.is_running {
            return;
        }
        
        // Calculate delta time
        let now = self.performance
            .as_ref()
            .map(|p| p.now())
            .unwrap_or(0.0);
        
        let delta_ms = now - self.last_frame_time;
        let delta_sec = delta_ms / 1000.0;
        self.last_frame_time = now;
        
        // Track performance
        self.frame_count += 1;
        self.accumulated_frame_time += delta_ms;
        
        // Log performance every N frames
        if self.config.enable_performance_logging 
            && self.frame_count % self.config.log_interval_frames == 0 
        {
            let avg_frame_time = self.accumulated_frame_time / self.config.log_interval_frames as f64;
            let fps = 1000.0 / avg_frame_time;
            
            self.logger.info(&format!(
                "Performance: {:.2} FPS, {:.2}ms avg frame time",
                fps, avg_frame_time
            ));
            
            self.accumulated_frame_time = 0.0;
        }
        
        // Emit FrameUpdate event with delta time
        self.event_bus.emit(GameEvent::FrameUpdate {
            delta_time: delta_sec,
            frame_number: self.frame_count,
        }).ok();
        
        // Check for frame drops (more than 2x target frame time)
        let target_frame_time = 1000.0 / self.config.target_fps;
        if delta_ms > target_frame_time * 2.0 {
            self.logger.warn(&format!(
                "Frame drop detected: {:.2}ms (target: {:.2}ms)",
                delta_ms, target_frame_time
            ));
        }
    }
    
    /// # Responsibility
    /// Handles player input actions.
    ///
    /// ---
    ///
    /// Validates action, emits PlayerAction event, and sends to backend.
    pub fn handle_player_action(&self, action: PlayerAction) {
        self.logger.debug(&format!("Player action: {:?}", action));
        
        // Emit action on EventBus (for local systems to react immediately)
        self.event_bus.emit(GameEvent::PlayerAction(Box::new(action.clone()))).ok();
        
        // Send to backend via WebSocket (handled by WebSocketClient subscriber)
    }
    
    /// # Responsibility
    /// Handles combat state updates from backend.
    ///
    /// ---
    ///
    /// Updates GameStateStore with authoritative backend state.
    pub fn handle_backend_state(&self, state: CombatState) {
        self.logger.debug("Received backend state update");
        
        // Update game store (triggers Leptos reactivity)
        self.game_store.update_from_backend(state.clone());
        
        // Emit event for systems that need to react
        self.event_bus.emit(GameEvent::CombatStateUpdated(Box::new(state))).ok();
    }
    
    /// # Responsibility
    /// Gets current frame count.
    pub fn get_frame_count(&self) -> u32 {
        self.frame_count
    }
    
    /// # Responsibility
    /// Checks if game loop is running.
    pub fn is_running(&self) -> bool {
        self.is_running
    }
    
    /// # Responsibility
    /// Gets current average FPS.
    pub fn get_avg_fps(&self) -> f64 {
        if self.accumulated_frame_time > 0.0 {
            let frame_count_in_window = self.frame_count % self.config.log_interval_frames;
            if frame_count_in_window > 0 {
                return 1000.0 * frame_count_in_window as f64 / self.accumulated_frame_time;
            }
        }
        self.config.target_fps
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::tests::mocks::{MockLogger, MockEventBus};
    
    fn create_test_service() -> GameControllerService {
        let config = GameControllerConfig::default();
        let logger = Arc::new(MockLogger);
        let event_bus = Arc::new(MockEventBus::new());
        let game_store = GameStateStore::new();
        
        GameControllerService::new(config, logger, event_bus, game_store)
    }
    
    #[test]
    fn test_game_controller_creation() {
        let service = create_test_service();
        
        assert!(!service.is_running());
        assert_eq!(service.get_frame_count(), 0);
        assert_eq!(service.config.target_fps, 60.0);
    }
    
    #[test]
    fn test_start_stop_game_loop() {
        let mut service = create_test_service();
        
        // Initially stopped
        assert!(!service.is_running());
        
        // Start
        service.start();
        assert!(service.is_running());
        
        // Stop
        service.stop();
        assert!(!service.is_running());
    }
    
    #[test]
    fn test_frame_count_increments() {
        let mut service = create_test_service();
        service.start();
        
        assert_eq!(service.get_frame_count(), 0);
        
        // Simulate frames
        service.update();
        assert_eq!(service.get_frame_count(), 1);
        
        service.update();
        assert_eq!(service.get_frame_count(), 2);
    }
    
    #[test]
    fn test_update_does_nothing_when_stopped() {
        let mut service = create_test_service();
        
        // Don't start - just update
        service.update();
        
        // Frame count should not increment
        assert_eq!(service.get_frame_count(), 0);
    }
}
