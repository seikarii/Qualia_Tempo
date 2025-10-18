//! # Responsibility
//! HTTP health check endpoint for monitoring and load balancing.

use axum::{
    extract::State,
    http::StatusCode,
    Json,
};
use serde::Serialize;
use std::sync::Arc;
use crate::services::WebSocketService;
use shared_core::traits::IWebSocketService;

/// # Responsibility
/// Health check response structure.
#[derive(Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub connected_clients: usize,
    pub timestamp: u64,
}

/// # Responsibility
/// Returns server health status and metrics.
///
/// ---
///
/// Used by load balancers and monitoring systems to verify server health.
/// Returns 200 OK if server is operational.
pub async fn health_check(
    State(ws_service): State<Arc<WebSocketService>>,
) -> Result<Json<HealthResponse>, StatusCode> {
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0); // Fallback to 0 if system time is before UNIX_EPOCH (virtually impossible)
    
    let response = HealthResponse {
        status: "ok".to_string(),
        connected_clients: ws_service.connection_count(),
        timestamp,
    };
    
    Ok(Json(response))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::core::QualiaLogger;
    
    #[tokio::test]
    async fn test_health_check_returns_ok() {
        let logger = Arc::new(QualiaLogger::default());
        let ws_service = Arc::new(WebSocketService::new(100, logger));
        
        let result = health_check(State(ws_service)).await;
        
        assert!(result.is_ok());
        let response = result.unwrap().0;
        assert_eq!(response.status, "ok");
        assert_eq!(response.connected_clients, 0);
    }
    
    #[tokio::test]
    async fn test_health_check_reports_connected_clients() {
        let logger = Arc::new(QualiaLogger::default());
        let ws_service = Arc::new(WebSocketService::new(100, logger));
        
        // Simulate connections
        let _rx1 = ws_service.subscribe();
        let _rx2 = ws_service.subscribe();
        
        let result = health_check(State(ws_service)).await;
        
        assert!(result.is_ok());
        let response = result.unwrap().0;
        assert_eq!(response.connected_clients, 2);
    }
}
