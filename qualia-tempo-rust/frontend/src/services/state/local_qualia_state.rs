//! # Responsibility
//! Provides client-side QualiaState caching and interpolation (BLUEPRINT #41).
//!
//! ---
//!
//! This service maintains a local cache of QualiaState received from the backend,
//! applies interpolation between updates to prevent visual jitter, and provides
//! smoothed state for UI rendering.

use anyhow::Result;
use leptos::*;
use shared_core::contracts::QualiaState;
use tracing::debug;

/// # Responsibility
/// Manages local QualiaState cache with interpolation for smooth visuals.
///
/// ---
///
/// Receives QualiaState updates from backend (via EventBus), stores them locally,
/// and provides interpolated values between updates to prevent stuttering.
#[derive(Clone)]
pub struct LocalQualiaStateService {
    /// Current qualia state signal (interpolated)
    pub state_signal: WriteSignal<QualiaState>,
    /// State reader signal
    pub state_reader: ReadSignal<QualiaState>,
    /// Interpolation factor (0.0 = instant, 1.0 = very smooth)
    smoothing_factor: f32,
}

impl LocalQualiaStateService {
    /// # Responsibility
    /// Creates a new LocalQualiaStateService with default smoothing.
    ///
    /// ---
    ///
    /// Initializes reactive signals and sets default interpolation factor to 0.3
    /// (30% smoothing, 70% instant update) for responsive yet smooth visuals.
    pub fn new() -> Result<Self> {
        let (state_reader, state_signal) = create_signal(QualiaState::default());

        debug!("LocalQualiaStateService initialized with smoothing factor 0.3");

        Ok(Self {
            state_signal,
            state_reader,
            smoothing_factor: 0.3,
        })
    }

    /// # Responsibility
    /// Creates service with custom smoothing factor.
    ///
    /// # Arguments
    /// - `smoothing_factor`: Interpolation factor (0.0 = instant, 1.0 = very smooth)
    pub fn with_smoothing(smoothing_factor: f32) -> Result<Self> {
        let (state_reader, state_signal) = create_signal(QualiaState::default());

        debug!("LocalQualiaStateService initialized with smoothing factor {}", smoothing_factor);

        Ok(Self {
            state_signal,
            state_reader,
            smoothing_factor: smoothing_factor.clamp(0.0, 1.0),
        })
    }

    /// # Responsibility
    /// Updates cached state with interpolation.
    ///
    /// ---
    ///
    /// Applies linear interpolation between current cached state and new state
    /// to prevent visual jitter from network latency/packet loss.
    ///
    /// # Arguments
    /// - `new_state`: QualiaState received from backend
    pub fn update_state(&self, new_state: QualiaState) {
        let current = self.state_reader.get();
        let interpolated = self.lerp_state(&current, &new_state);

        self.state_signal.set(interpolated);

        debug!(
            "QualiaState updated: intensity={:.2}, precision={:.2}, flow={:.2}",
            interpolated.intensity, interpolated.precision, interpolated.flow
        );
    }

    /// # Responsibility
    /// Linearly interpolates between two QualiaState values.
    ///
    /// ---
    ///
    /// Uses smoothing_factor as lerp weight: result = current + (new - current) * (1 - smoothing).
    fn lerp_state(&self, current: &QualiaState, new: &QualiaState) -> QualiaState {
        let weight = 1.0 - self.smoothing_factor;

        QualiaState {
            intensity: Self::lerp(current.intensity, new.intensity, weight),
            precision: Self::lerp(current.precision, new.precision, weight),
            aggression: Self::lerp(current.aggression, new.aggression, weight),
            flow: Self::lerp(current.flow, new.flow, weight),
            chaos: Self::lerp(current.chaos, new.chaos, weight),
            recovery: Self::lerp(current.recovery, new.recovery, weight),
            transcendence: Self::lerp(current.transcendence, new.transcendence, weight),
            collection_window_end: new.collection_window_end, // No interpolation for timestamps
        }
    }

    /// # Responsibility
    /// Linear interpolation helper.
    fn lerp(a: f32, b: f32, t: f32) -> f32 {
        a + (b - a) * t
    }

    /// # Responsibility
    /// Gets current cached state (read-only).
    #[must_use]
    pub fn get_state(&self) -> QualiaState {
        self.state_reader.get()
    }

    /// # Responsibility
    /// Sets smoothing factor dynamically.
    ///
    /// # Arguments
    /// - `factor`: New smoothing factor (0.0 = instant, 1.0 = very smooth)
    pub fn set_smoothing_factor(&mut self, factor: f32) {
        self.smoothing_factor = factor.clamp(0.0, 1.0);
        debug!("Smoothing factor updated to {}", self.smoothing_factor);
    }
}

impl Default for LocalQualiaStateService {
    fn default() -> Self {
        Self::new().expect("Failed to create LocalQualiaStateService")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_lerp_state_no_smoothing() {
        let service = LocalQualiaStateService::with_smoothing(0.0).unwrap();

        let current = QualiaState {
            intensity: 0.0,
            precision: 0.0,
            aggression: 0.0,
            flow: 0.0,
            chaos: 0.0,
            recovery: 0.0,
            transcendence: 0.0,
            collection_window_end: 0.0,
        };

        let new = QualiaState {
            intensity: 1.0,
            precision: 1.0,
            aggression: 1.0,
            flow: 1.0,
            chaos: 1.0,
            recovery: 1.0,
            transcendence: 1.0,
            collection_window_end: 1000.0,
        };

        let result = service.lerp_state(&current, &new);

        // With 0.0 smoothing, should snap instantly to new state
        assert_eq!(result.intensity, 1.0);
        assert_eq!(result.precision, 1.0);
        assert_eq!(result.flow, 1.0);
    }

    #[test]
    fn test_lerp_state_full_smoothing() {
        let service = LocalQualiaStateService::with_smoothing(1.0).unwrap();

        let current = QualiaState {
            intensity: 0.0,
            ..Default::default()
        };

        let new = QualiaState {
            intensity: 1.0,
            ..Default::default()
        };

        let result = service.lerp_state(&current, &new);

        // With 1.0 smoothing, should not change (weight = 0)
        assert_eq!(result.intensity, 0.0);
    }

    #[test]
    fn test_lerp_state_half_smoothing() {
        let service = LocalQualiaStateService::with_smoothing(0.5).unwrap();

        let current = QualiaState {
            intensity: 0.0,
            ..Default::default()
        };

        let new = QualiaState {
            intensity: 1.0,
            ..Default::default()
        };

        let result = service.lerp_state(&current, &new);

        // With 0.5 smoothing, weight = 0.5, so result = 0.0 + (1.0 - 0.0) * 0.5 = 0.5
        assert_eq!(result.intensity, 0.5);
    }

    #[test]
    fn test_update_state() {
        let service = LocalQualiaStateService::with_smoothing(0.0).unwrap();

        let new_state = QualiaState {
            intensity: 0.8,
            precision: 0.9,
            flow: 0.7,
            ..Default::default()
        };

        service.update_state(new_state);

        let cached = service.get_state();
        assert_eq!(cached.intensity, 0.8);
        assert_eq!(cached.precision, 0.9);
        assert_eq!(cached.flow, 0.7);
    }

    #[test]
    fn test_default_smoothing_factor() {
        let service = LocalQualiaStateService::new().unwrap();
        assert_eq!(service.smoothing_factor, 0.3);
    }
}
