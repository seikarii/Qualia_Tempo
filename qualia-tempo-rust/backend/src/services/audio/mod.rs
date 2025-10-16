//! # Responsibility
//! Audio analysis services for musical harmony and rhythm processing.
//!
//! ---
//!
//! This module contains services for analyzing musical harmony, detecting
//! chord patterns, and scoring player input against song harmony.

pub mod harmony_analyzer;

pub use harmony_analyzer::{
    HarmonyAnalysisService,
    IHarmonyAnalysisService,
    HarmonyAnalysisConfig,
};
