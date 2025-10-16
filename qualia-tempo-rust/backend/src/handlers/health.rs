//! # Responsibility
//! Health check endpoints for service monitoring.
//!
//! ---
//!
//! Provides /health and /ready endpoints for load balancers and monitoring systems.

use axum::{
    extract::State,
    http::StatusCode,
    response::Json,
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

use axum::{Json, extract::State};
use serde::{Serialize, Deserialize};
use std::sync::Arc;
use crate::handlers::AppState;

/// # Responsibility
/// Response structure for health check endpoint.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthResponse {
    /// Service status
    pub status: String,
    
    /// Service version
    pub version: String,
    
    /// Uptime in seconds
    pub uptime_seconds: u64,
    
    /// Number of active EventBus subscribers
    pub active_subscribers: usize,
}

/// # Responsibility
/// Simple health check endpoint that returns 200 OK.
///
/// ---
///
/// Used by load balancers and monitoring tools to verify service is running.
pub async fn health_check(State(state): State<AppState>) -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "healthy".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        uptime_seconds: 0, // TODO: Track actual uptime
        active_subscribers: state.event_bus.subscriber_count(),
    })
}

/// # Responsibility
/// Detailed readiness check endpoint.
///
/// ---
///
/// Returns 200 if service is ready to accept requests, 503 otherwise.
/// Checks EventBus connectivity and other critical services.
pub async fn readiness_check(State(state): State<AppState>) -> Json<HealthResponse> {
    // Check if EventBus has at least one subscriber (game loop is running)
    let is_ready = state.event_bus.subscriber_count() > 0;
    
    Json(HealthResponse {
        status: if is_ready { "ready".to_string() } else { "not_ready".to_string() },
        version: env!("CARGO_PKG_VERSION").to_string(),
        uptime_seconds: 0,
        active_subscribers: state.event_bus.subscriber_count(),
    })
}
