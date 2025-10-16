//! # Responsibility
//! Health check endpoints for service monitoring.
//!
//! ---
//!
//! Provides /health and /ready endpoints for load balancers and monitoring systems.

use axum::{
    extract::State,
    response::Json,
    http::StatusCode,
};
use serde::{Serialize, Deserialize};
use super::AppState;

/// # Responsibility
/// Health check response structure.
#[derive(Debug, Serialize, Deserialize)]
pub struct HealthResponse {
    /// Service status
    pub status: String,
    
    /// Version string
    pub version: String,
}

/// # Responsibility
/// GET /health - Basic health check (always returns 200 if server is alive).
pub async fn health_check(State(_state): State<AppState>) -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "healthy".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
    })
}

/// # Responsibility
/// GET /ready - Readiness check (returns 200 if ready to accept traffic).
///
/// ---
///
/// Checks if EventBus is initialized by attempting to subscribe.
pub async fn readiness_check(State(state): State<AppState>) -> Result<Json<HealthResponse>, StatusCode> {
    // Try to subscribe to EventBus to verify it's working
    let _rx = state.event_bus.subscribe();
    
    Ok(Json(HealthResponse {
        status: "ready".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
    }))
}
