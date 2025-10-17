//! # Responsibility
//! Trait interfaces for gameplay services.

use async_trait::async_trait;
use shaku::Interface;
use anyhow::Result;
use shared_core::contracts::{PlayerAction, QualiaState};

/// # Responsibility
/// Interface for the core game logic orchestration service.
///
/// ---
///
/// Processes player actions, calculates qualia state, and coordinates game flow.
#[async_trait]
pub trait IGameLogicService: Interface {
    /// Process a player action and return the new qualia state.
    async fn process_action(&self, action: PlayerAction) -> Result<QualiaState>;
}

/// # Responsibility
/// Represents boss AI phases aligned with song progression.
///
/// ---
///
/// Per GDD.md: Boss phases transition based on song progress percentage.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BossPhase {
    /// 0-15% song progress: Gentle introduction, long telegraphs
    Intro,
    /// 15-50% song progress: Normal difficulty
    Standard,
    /// 50-85% song progress: Increased aggression, shorter telegraphs
    Intensified,
    /// 85-100% song progress: Maximum intensity, minimal telegraphs
    Final,
}

/// # Responsibility
/// Interface for boss AI behavior and phase management.
///
/// ---
///
/// Controls boss difficulty scaling based on song progress and player performance.
/// Per GDD.md: Boss attacks synchronize to music with dynamic telegraph durations.
#[async_trait]
pub trait IBossAI: Interface {
    /// Update boss AI state based on song progress and qualia state.
    /// Returns true if phase changed.
    async fn update(&self, song_progress: f32, qualia: QualiaState) -> Result<bool>;
    
    /// Get current boss phase.
    fn current_phase(&self) -> BossPhase;
    
    /// Calculate current aggression level (0.0-1.0) based on phase and player combo.
    fn current_aggression(&self) -> f32;
    
    /// Calculate telegraph duration in milliseconds for current phase/aggression.
    fn calculate_telegraph_duration(&self) -> u64;
}
