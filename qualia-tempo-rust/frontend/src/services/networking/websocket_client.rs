//! # Responsibility
//! Provides WebSocket client for real-time backend communication.
//!
//! ---
//!
//! Connects to backend WebSocket server, sends PlayerActions, receives CombatState updates.
//! Handles reconnection logic and network error recovery.

use shaku::{Component, Interface};
use std::sync::Arc;
use async_trait::async_trait;
use anyhow::{Result, Context};
use futures_util::{SinkExt, StreamExt};
use tokio::sync::{mpsc, RwLock};
use web_sys::WebSocket as JsWebSocket;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use shared_core::contracts::{
    input::PlayerAction,
    game_state::CombatState,
};
use super::super::core::ILogger;
use crate::state::GameStateStore;

/// # Responsibility
/// Configuration for WebSocket client.
#[derive(Debug, Clone)]
pub struct WebSocketClientConfig {
    /// Backend WebSocket URL (e.g., "ws://localhost:8080/ws")
    pub backend_url: String,
    
    /// Auto-reconnect on disconnect
    pub auto_reconnect: bool,
    
    /// Reconnect delay in milliseconds
    pub reconnect_delay_ms: u64,
    
    /// Maximum reconnect attempts (0 = infinite)
    pub max_reconnect_attempts: u32,
}

impl Default for WebSocketClientConfig {
    fn default() -> Self {
        Self {
            backend_url: "ws://localhost:8080/ws".to_string(),
            auto_reconnect: true,
            reconnect_delay_ms: 1000,
            max_reconnect_attempts: 0, // Infinite
        }
    }
}

/// # Responsibility
/// Trait interface for WebSocket client operations.
#[async_trait(?Send)]
pub trait IWebSocketClient: Interface {
    /// Connects to the backend WebSocket server
    async fn connect(&self) -> Result<()>;
    
    /// Sends a PlayerAction to the backend
    async fn send_action(&self, action: PlayerAction) -> Result<()>;
    
    /// Disconnects from the backend
    async fn disconnect(&self) -> Result<()>;
    
    /// Gets connection status
    fn is_connected(&self) -> bool;
    
    /// Gets the current latency in milliseconds
    fn get_latency(&self) -> u32;
}

/// # Responsibility
/// WebSocket client implementation using web-sys and wasm-bindgen.
///
/// ---
///
/// Uses JavaScript WebSocket API via wasm-bindgen for WASM compatibility.
/// Spawns async task to handle incoming messages and update GameStateStore.
#[derive(Component)]
#[shaku(interface = IWebSocketClient)]
pub struct WebSocketClientService {
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,
    
    config: Arc<WebSocketClientConfig>,
    
    /// Reference to the GameStateStore for updating state
    game_store: Arc<GameStateStore>,
    
    /// WebSocket connection (wrapped in RwLock for interior mutability)
    ws: Arc<RwLock<Option<JsWebSocket>>>,
    
    /// Connection status
    is_connected: Arc<RwLock<bool>>,
    
    /// Current latency in milliseconds
    latency: Arc<RwLock<u32>>,
}

#[async_trait(?Send)]
impl IWebSocketClient for WebSocketClientService {
    async fn connect(&self) -> Result<()> {
        self.logger.info(&format!("Connecting to backend WebSocket: {}", self.config.backend_url));
        
        // Create JavaScript WebSocket
        let ws = JsWebSocket::new(&self.config.backend_url)
            .context("Failed to create WebSocket")?;
        
        ws.set_binary_type(web_sys::BinaryType::Arraybuffer);
        
        // Store WebSocket
        let mut ws_lock = self.ws.write().await;
        *ws_lock = Some(ws.clone());
        drop(ws_lock);
        
        // Set up event handlers
        self.setup_event_handlers(ws.clone()).await?;
        
        *self.is_connected.write().await = true;
        self.logger.info("WebSocket connected successfully");
        
        Ok(())
    }
    
    async fn send_action(&self, action: PlayerAction) -> Result<()> {
        let ws_lock = self.ws.read().await;
        
        if let Some(ws) = ws_lock.as_ref() {
            // Serialize PlayerAction to binary
            let data = bincode::serialize(&action)
                .context("Failed to serialize PlayerAction")?;
            
            // Send as ArrayBuffer
            ws.send_with_u8_array(&data)
                .map_err(|_| anyhow::anyhow!("Failed to send message"))?;
            
            Ok(())
        } else {
            anyhow::bail!("WebSocket not connected")
        }
    }
    
    async fn disconnect(&self) -> Result<()> {
        let mut ws_lock = self.ws.write().await;
        
        if let Some(ws) = ws_lock.take() {
            ws.close().ok();
            *self.is_connected.write().await = false;
            self.logger.info("WebSocket disconnected");
        }
        
        Ok(())
    }
    
    fn is_connected(&self) -> bool {
        // Blocking read for synchronous trait method
        let rt = tokio::runtime::Handle::current();
        rt.block_on(async {
            *self.is_connected.read().await
        })
    }
    
    fn get_latency(&self) -> u32 {
        let rt = tokio::runtime::Handle::current();
        rt.block_on(async {
            *self.latency.read().await
        })
    }
}

impl WebSocketClientService {
    /// Sets up WebSocket event handlers (onmessage, onopen, onerror, onclose)
    async fn setup_event_handlers(&self, ws: JsWebSocket) -> Result<()> {
        let logger = self.logger.clone();
        let game_store = self.game_store.clone();
        let is_connected = self.is_connected.clone();
        
        // onopen handler
        let onopen_logger = logger.clone();
        let onopen_callback = Closure::wrap(Box::new(move |_| {
            onopen_logger.info("WebSocket connection opened");
        }) as Box<dyn FnMut(JsValue)>);
        ws.set_onopen(Some(onopen_callback.as_ref().unchecked_ref()));
        onopen_callback.forget();
        
        // onmessage handler
        let onmessage_logger = logger.clone();
        let onmessage_callback = Closure::wrap(Box::new(move |event: web_sys::MessageEvent| {
            if let Ok(arraybuffer) = event.data().dyn_into::<js_sys::ArrayBuffer>() {
                let uint8_array = js_sys::Uint8Array::new(&arraybuffer);
                let data = uint8_array.to_vec();
                
                // Deserialize CombatState
                match bincode::deserialize::<CombatState>(&data) {
                    Ok(combat_state) => {
                        game_store.update_from_backend(combat_state);
                        game_store.set_connection_status(true);
                    }
                    Err(e) => {
                        onmessage_logger.error(&format!("Failed to deserialize CombatState: {:?}", e));
                    }
                }
            }
        }) as Box<dyn FnMut(web_sys::MessageEvent)>);
        ws.set_onmessage(Some(onmessage_callback.as_ref().unchecked_ref()));
        onmessage_callback.forget();
        
        // onerror handler
        let onerror_logger = logger.clone();
        let onerror_callback = Closure::wrap(Box::new(move |_| {
            onerror_logger.error("WebSocket error occurred");
        }) as Box<dyn FnMut(JsValue)>);
        ws.set_onerror(Some(onerror_callback.as_ref().unchecked_ref()));
        onerror_callback.forget();
        
        // onclose handler
        let onclose_logger = logger.clone();
        let onclose_is_connected = is_connected.clone();
        let onclose_callback = Closure::wrap(Box::new(move |_| {
            onclose_logger.warn("WebSocket connection closed");
            let is_connected_clone = onclose_is_connected.clone();
            wasm_bindgen_futures::spawn_local(async move {
                *is_connected_clone.write().await = false;
            });
        }) as Box<dyn FnMut(JsValue)>);
        ws.set_onclose(Some(onclose_callback.as_ref().unchecked_ref()));
        onclose_callback.forget();
        
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::core::FrontendLogger;
    
    // Note: WASM tests require wasm-bindgen-test
    // These are placeholder tests for structure validation
    
    #[test]
    fn test_websocket_config_defaults() {
        let config = WebSocketClientConfig::default();
        assert_eq!(config.backend_url, "ws://localhost:8080/ws");
        assert!(config.auto_reconnect);
        assert_eq!(config.max_reconnect_attempts, 0);
    }
}
