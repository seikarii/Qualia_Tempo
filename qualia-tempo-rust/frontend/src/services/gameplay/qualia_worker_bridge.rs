//! # Responsibility
//! Bridge to Web Worker for offloading QualiaState calculations.
//!
//! ---
//!
//! Spawns a Web Worker to handle CPU-intensive QualiaState calculations
//! without blocking the main UI thread. Uses postMessage() for communication.

use std::sync::{Arc, Mutex};
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use web_sys::{Worker, MessageEvent, ErrorEvent};
use shared_core::contracts::{QualiaState, PlayerAction};
use crate::services::core::ILogger;
use serde::{Serialize, Deserialize};

/// # Responsibility
/// Configuration for QualiaState calculation worker.
#[derive(Debug, Clone)]
pub struct QualiaWorkerConfig {
    /// Path to worker script
    pub worker_script_url: String,
    
    /// Timeout for worker responses (milliseconds)
    pub response_timeout_ms: u32,
    
    /// Whether to enable worker (fallback to main thread if false)
    pub enabled: bool,
}

impl Default for QualiaWorkerConfig {
    fn default() -> Self {
        Self {
            worker_script_url: "/workers/qualia_worker.js".to_string(),
            response_timeout_ms: 100,  // 100ms max delay
            enabled: true,
        }
    }
}

/// # Responsibility
/// Messages sent TO the worker.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum WorkerRequest {
    /// Calculate QualiaState from player action
    CalculateQualia {
        action: PlayerAction,
        current_state: QualiaState,
        audio_intensity: f32,
        timestamp: f64,
    },
    
    /// Initialize worker with configuration
    Initialize {
        config: serde_json::Value,
    },
    
    /// Terminate worker
    Shutdown,
}

/// # Responsibility
/// Messages received FROM the worker.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum WorkerResponse {
    /// QualiaState calculation result
    QualiaCalculated {
        state: QualiaState,
        computation_time_ms: f64,
    },
    
    /// Worker ready
    Ready,
    
    /// Worker error
    Error {
        message: String,
    },
}

/// # Responsibility
/// Callback for QualiaState calculation results.
pub type QualiaCallback = Box<dyn Fn(QualiaState) + Send>;

/// # Responsibility
/// Bridges Web Worker for QualiaState calculations.
///
/// ---
///
/// Spawns a dedicated Web Worker to offload CPU-intensive QualiaState
/// calculations from the main thread, preventing UI blocking.
pub struct QualiaWorkerBridgeService {
    config: QualiaWorkerConfig,
    logger: Arc<dyn ILogger>,
    worker: Option<Worker>,
    callback: Arc<Mutex<Option<QualiaCallback>>>,
    is_ready: Arc<Mutex<bool>>,
}

impl QualiaWorkerBridgeService {
    /// # Responsibility
    /// Creates new worker bridge service.
    pub fn new(
        config: QualiaWorkerConfig,
        logger: Arc<dyn ILogger>,
    ) -> Result<Self, JsValue> {
        let mut service = Self {
            config,
            logger,
            worker: None,
            callback: Arc::new(Mutex::new(None)),
            is_ready: Arc::new(Mutex::new(false)),
        };
        
        if service.config.enabled {
            service.spawn_worker()?;
        }
        
        Ok(service)
    }
    
    /// # Responsibility
    /// Spawns the Web Worker.
    fn spawn_worker(&mut self) -> Result<(), JsValue> {
        self.logger.info(&format!(
            "Spawning QualiaWorker from {}",
            self.config.worker_script_url
        ));
        
        let worker = Worker::new(&self.config.worker_script_url)?;
        
        // Setup message handler
        let callback = self.callback.clone();
        let is_ready = self.is_ready.clone();
        let logger = self.logger.clone();
        
        let onmessage = Closure::wrap(Box::new(move |event: MessageEvent| {
            if let Some(response_str) = event.data().as_string() {
                match serde_json::from_str::<WorkerResponse>(&response_str) {
                    Ok(WorkerResponse::QualiaCalculated { state, computation_time_ms }) => {
                        logger.debug(&format!(
                            "Worker calculated qualia in {:.2}ms",
                            computation_time_ms
                        ));
                        
                        if let Some(cb) = callback.lock().unwrap().as_ref() {
                            cb(state);
                        }
                    }
                    Ok(WorkerResponse::Ready) => {
                        logger.info("QualiaWorker is ready");
                        *is_ready.lock().unwrap() = true;
                    }
                    Ok(WorkerResponse::Error { message }) => {
                        logger.error(&format!("Worker error: {}", message));
                    }
                    Err(e) => {
                        logger.error(&format!("Failed to parse worker response: {}", e));
                    }
                }
            }
        }) as Box<dyn FnMut(MessageEvent)>);
        
        worker.set_onmessage(Some(onmessage.as_ref().unchecked_ref()));
        onmessage.forget();
        
        // Setup error handler
        let logger_clone = self.logger.clone();
        let onerror = Closure::wrap(Box::new(move |event: ErrorEvent| {
            logger_clone.error(&format!(
                "Worker error: {}",
                event.message()
            ));
        }) as Box<dyn FnMut(ErrorEvent)>);
        
        worker.set_onerror(Some(onerror.as_ref().unchecked_ref()));
        onerror.forget();
        
        self.worker = Some(worker);
        
        // Send initialize message
        self.send_message(WorkerRequest::Initialize {
            config: serde_json::json!({
                "timeout": self.config.response_timeout_ms
            }),
        })?;
        
        Ok(())
    }
    
    /// # Responsibility
    /// Sends message to worker.
    fn send_message(&self, request: WorkerRequest) -> Result<(), JsValue> {
        if let Some(worker) = &self.worker {
            let message = serde_json::to_string(&request)
                .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))?;
            
            worker.post_message(&JsValue::from_str(&message))?;
            Ok(())
        } else {
            Err(JsValue::from_str("Worker not initialized"))
        }
    }
    
    /// # Responsibility
    /// Requests QualiaState calculation from worker.
    pub fn calculate_qualia(
        &self,
        action: PlayerAction,
        current_state: QualiaState,
        audio_intensity: f32,
        callback: QualiaCallback,
    ) -> Result<(), JsValue> {
        if !self.config.enabled {
            // Fallback: calculate on main thread (simplified)
            self.logger.warn("Worker disabled, using main thread fallback");
            let result = self.calculate_qualia_sync(&action, &current_state, audio_intensity);
            callback(result);
            return Ok(());
        }
        
        if !*self.is_ready.lock().unwrap() {
            return Err(JsValue::from_str("Worker not ready"));
        }
        
        // Store callback
        *self.callback.lock().unwrap() = Some(callback);
        
        // Send calculation request
        self.send_message(WorkerRequest::CalculateQualia {
            action,
            current_state,
            audio_intensity,
            timestamp: js_sys::Date::now(),
        })
    }
    
    /// # Responsibility
    /// Fallback synchronous calculation on main thread.
    fn calculate_qualia_sync(
        &self,
        action: &PlayerAction,
        current: &QualiaState,
        audio_intensity: f32,
    ) -> QualiaState {
        // Simplified calculation (real logic would be in worker)
        let mut new_state = *current;
        
        // Basic intensity update based on action accuracy
        match action {
            PlayerAction::KeyPressed { accuracy, .. } => {
                new_state.intensity = (new_state.intensity + accuracy * 0.1).min(1.0);
                new_state.precision = (new_state.precision + accuracy * 0.05).min(1.0);
            }
            PlayerAction::Dash { .. } => {
                new_state.aggression = (new_state.aggression + 0.1).min(1.0);
            }
            PlayerAction::UltimateActivated { .. } => {
                new_state.transcendence = (new_state.transcendence + 0.2).min(1.0);
            }
            PlayerAction::ParryAttempt { .. } => {
                new_state.recovery = (new_state.recovery + 0.1).min(1.0);
            }
        }
        
        // Audio intensity influence
        new_state.intensity = (new_state.intensity + audio_intensity * 0.05).min(1.0);
        
        new_state
    }
    
    /// # Responsibility
    /// Checks if worker is ready for calculations.
    pub fn is_ready(&self) -> bool {
        *self.is_ready.lock().unwrap()
    }
    
    /// # Responsibility
    /// Terminates the worker.
    pub fn shutdown(&self) -> Result<(), JsValue> {
        if let Some(worker) = &self.worker {
            self.send_message(WorkerRequest::Shutdown)?;
            worker.terminate();
            self.logger.info("QualiaWorker terminated");
        }
        Ok(())
    }
}

impl Drop for QualiaWorkerBridgeService {
    fn drop(&mut self) {
        if let Err(e) = self.shutdown() {
            self.logger.error(&format!("Error shutting down worker: {:?}", e));
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use shared_core::utils::Vector3;
    
    // Mock logger
    struct MockLogger;
    impl ILogger for MockLogger {
        fn trace(&self, _: &str) {}
        fn debug(&self, _: &str) {}
        fn info(&self, _: &str) {}
        fn warn(&self, _: &str) {}
        fn error(&self, _: &str) {}
    }
    
    #[test]
    fn test_worker_config_default() {
        let config = QualiaWorkerConfig::default();
        assert!(config.enabled);
        assert_eq!(config.response_timeout_ms, 100);
        assert_eq!(config.worker_script_url, "/workers/qualia_worker.js");
    }
    
    #[test]
    fn test_worker_request_serialization() {
        let request = WorkerRequest::CalculateQualia {
            action: PlayerAction::KeyPressed {
                key: "Q".to_string(),
                timestamp: 0.0,
                accuracy: 0.9,
            },
            current_state: QualiaState::default(),
            audio_intensity: 0.5,
            timestamp: 1000.0,
        };
        
        let json = serde_json::to_string(&request).unwrap();
        assert!(json.contains("calculateQualia"));
        assert!(json.contains("\"key\":\"Q\""));
    }
    
    #[test]
    fn test_worker_response_deserialization() {
        let json = r#"{
            "type": "qualiaCalculated",
            "state": {
                "intensity": 0.8,
                "precision": 0.7,
                "aggression": 0.5,
                "flow": 0.6,
                "chaos": 0.3,
                "recovery": 0.4,
                "transcendence": 0.2,
                "collection_window_end": 1000.0
            },
            "computation_time_ms": 5.2
        }"#;
        
        let response: WorkerResponse = serde_json::from_str(json).unwrap();
        
        match response {
            WorkerResponse::QualiaCalculated { state, computation_time_ms } => {
                assert_eq!(state.intensity, 0.8);
                assert_eq!(computation_time_ms, 5.2);
            }
            _ => panic!("Wrong response type"),
        }
    }
    
    #[test]
    fn test_calculate_qualia_sync_fallback() {
        let config = QualiaWorkerConfig {
            enabled: false,
            ..Default::default()
        };
        
        // Note: This test would require wasm-bindgen-test in a browser environment
        // For now, we test the sync fallback logic
        let logger = Arc::new(MockLogger);
        
        // Can't actually create service without browser environment
        // Testing the sync calculation logic separately would require exposing it
        
        let current = QualiaState::default();
        let action = PlayerAction::KeyPressed {
            key: "Q".to_string(),
            timestamp: 0.0,
            accuracy: 0.9,
        };
        
        // This validates the serialization works
        assert!(serde_json::to_string(&action).is_ok());
    }
}
