//! # Responsibility
//! REST API handlers for leaderboard, combat data, etc.

use axum::{Json, extract::{State, Path}};
use serde::{Serialize, Deserialize};
use crate::handlers::AppState;

/// # Responsibility
/// Response for combat data endpoint.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CombatDataResponse {
    /// Combat ID
    pub id: String,
    
    /// Song title
    pub title: String,
    
    /// Artist name
    pub artist: String,
    
    /// BPM
    pub bpm: f64,
    
    /// Duration in seconds
    pub duration_sec: f64,
}

/// # Responsibility
/// Gets combat data for a specific song/level.
///
/// ---
///
/// Called by frontend to load combat configuration before starting gameplay.
pub async fn get_combat_data(
    State(_state): State<AppState>,
    Path(combat_id): Path<String>,
) -> Json<CombatDataResponse> {
    // TODO: Load from file system or database
    Json(CombatDataResponse {
        id: combat_id,
        title: "The First Duel".to_string(),
        artist: "Qualia Tempo OST".to_string(),
        bpm: 140.0,
        duration_sec: 240.0,
    })
}

/// # Responsibility
/// Lists all available combat scenarios.
pub async fn list_combat_data(State(_state): State<AppState>) -> Json<Vec<CombatDataResponse>> {
    // TODO: Load from file system or database
    Json(vec![
        CombatDataResponse {
            id: "the_first_duel".to_string(),
            title: "The First Duel".to_string(),
            artist: "Qualia Tempo OST".to_string(),
            bpm: 140.0,
            duration_sec: 240.0,
        }
    ])
}
