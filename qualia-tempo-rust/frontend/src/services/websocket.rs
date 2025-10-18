//! # Responsibility
//! WebSocket client for backend communication (BLUEPRINT.RUST #46).
//!
//! ---
//!
//! Manages WebSocket connection lifecycle, message serialization/deserialization,
//! and event distribution to local frontend event bus.

use anyhow::Result;
use serde_json;
use shared_core::contracts::*;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use web_sys::{MessageEvent, WebSocket};

/// # Responsibility
/// WebSocket client for real-time backend communication.
///
/// ---
///
/// Connects to backend WebSocket endpoint, sends PlayerAction messages,
/// receives CombatState updates. Handles connection lifecycle and reconnection.
pub struct WebSocketService {
    ws: Option<WebSocket>,
    url: String,
}

impl WebSocketService {
    /// Create new WebSocket service
    ///
    /// # Arguments
    /// - `url`: WebSocket server URL (e.g., "ws://localhost:3000/ws")
    pub fn new(url: String) -> Self {
        Self { ws: None, url }
    }
    
    /// Connect to WebSocket server
    pub async fn connect(&mut self) -> Result<()> {
        let ws = WebSocket::new(&self.url)
            .map_err(|_| anyhow::anyhow!("Failed to create WebSocket"))?;
        
        // Set binary type to arraybuffer for efficient serialization
        ws.set_binary_type(web_sys::BinaryType::Arraybuffer);
        
        // Setup onopen callback
        let onopen_callback = Closure::wrap(Box::new(move |_| {
            tracing::info!("WebSocket connected");
        }) as Box<dyn FnMut(JsValue)>);
        ws.set_onopen(Some(onopen_callback.as_ref().unchecked_ref()));
        onopen_callback.forget();
        
        // Setup onmessage callback
        let onmessage_callback = Closure::wrap(Box::new(move |e: MessageEvent| {
            // Parse incoming CombatState message
            if let Ok(text) = e.data().dyn_into::<js_sys::JsString>() {
                let text_str = text.as_string().unwrap_or_default();
                match serde_json::from_str::<CombatState>(&text_str) {
                    Ok(_state) => {
                        tracing::debug!("Received CombatState update");
                        // Phase 8: Emit to local event bus with _state
                    }
                    Err(e) => {
                        tracing::error!("Failed to parse CombatState: {:?}", e);
                    }
                }
            }
        }) as Box<dyn FnMut(MessageEvent)>);
        ws.set_onmessage(Some(onmessage_callback.as_ref().unchecked_ref()));
        onmessage_callback.forget();
        
        // Setup onerror callback
        let onerror_callback = Closure::wrap(Box::new(move |_| {
            tracing::error!("WebSocket error");
        }) as Box<dyn FnMut(JsValue)>);
        ws.set_onerror(Some(onerror_callback.as_ref().unchecked_ref()));
        onerror_callback.forget();
        
        // Setup onclose callback
        let onclose_callback = Closure::wrap(Box::new(move |_| {
            tracing::info!("WebSocket closed");
        }) as Box<dyn FnMut(JsValue)>);
        ws.set_onclose(Some(onclose_callback.as_ref().unchecked_ref()));
        onclose_callback.forget();
        
        self.ws = Some(ws);
        
        Ok(())
    }
    
    /// Send PlayerAction to backend
    ///
    /// # Arguments
    /// - `action`: PlayerAction to send
    pub fn send_action(&self, action: &PlayerAction) -> Result<()> {
        let ws = self.ws.as_ref()
            .ok_or_else(|| anyhow::anyhow!("WebSocket not connected"))?;
        
        let json = serde_json::to_string(action)?;
        ws.send_with_str(&json)
            .map_err(|_| anyhow::anyhow!("Failed to send message"))?;
        
        Ok(())
    }
    
    /// Close WebSocket connection
    pub fn close(&mut self) -> Result<()> {
        if let Some(ws) = self.ws.take() {
            ws.close()
                .map_err(|_| anyhow::anyhow!("Failed to close WebSocket"))?;
        }
        Ok(())
    }
    
    /// Check if WebSocket is connected
    pub fn is_connected(&self) -> bool {
        self.ws.as_ref()
            .map(|ws| ws.ready_state() == WebSocket::OPEN)
            .unwrap_or(false)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_websocket_service_creation() {
        let service = WebSocketService::new("ws://localhost:3000/ws".to_string());
        assert!(!service.is_connected());
    }
}
