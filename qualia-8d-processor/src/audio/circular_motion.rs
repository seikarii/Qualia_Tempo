//! # Responsibility
//! Generates 3D spherical positions for circular motion over time.

use std::f32::consts::PI;

/// # Responsibility
/// Calculates 3D spatial positions for sources moving in circular paths.
pub struct CircularMotionEngine {
    rotation_speed_rpm: f32,
    radius_meters: f32,
    elevation_degrees: f32,
    direction: RotationDirection,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum RotationDirection {
    Clockwise,
    CounterClockwise,
}

/// # Responsibility
/// Represents a 3D position in spherical coordinates.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SphericalPosition {
    pub azimuth_deg: f32,      // 0-360°, 0=front, 90=right
    pub elevation_deg: f32,    // -90 to +90°, 0=horizontal
    pub distance_m: f32,       // Meters from listener
}

impl CircularMotionEngine {
    pub fn new(speed_rpm: f32, radius_m: f32, elevation_deg: f32, direction: RotationDirection) -> Self {
        Self {
            rotation_speed_rpm: speed_rpm,
            radius_meters: radius_m,
            elevation_degrees: elevation_deg,
            direction,
        }
    }

    /// Calculate position at specific time
    pub fn calculate_position(&self, time_sec: f64) -> SphericalPosition {
        let omega = self.rotation_speed_rpm * 2.0 * PI / 60.0; // rad/s
        let theta = (omega * time_sec as f32) % (2.0 * PI);
        
        let mut theta_deg = match self.direction {
            RotationDirection::Clockwise => theta.to_degrees(),
            RotationDirection::CounterClockwise => 360.0 - theta.to_degrees(),
        };
        
        // Normalize to [0, 360) range
        while theta_deg < 0.0 {
            theta_deg += 360.0;
        }
        while theta_deg >= 360.0 {
            theta_deg -= 360.0;
        }
        
        SphericalPosition {
            azimuth_deg: theta_deg,
            elevation_deg: self.elevation_degrees,
            distance_m: self.radius_meters,
        }
    }

    /// Calculate positions for array of time samples
    pub fn calculate_trajectory(&self, sample_rate: u32, duration_sec: f32) -> Vec<SphericalPosition> {
        let num_samples = (sample_rate as f32 * duration_sec) as usize;
        let dt = 1.0 / sample_rate as f64;
        
        (0..num_samples)
            .map(|i| self.calculate_position(i as f64 * dt))
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn test_position_at_zero_time() {
        let engine = CircularMotionEngine::new(6.0, 1.5, 0.0, RotationDirection::Clockwise);
        let pos = engine.calculate_position(0.0);
        
        assert_relative_eq!(pos.azimuth_deg, 0.0, epsilon = 0.01);
        assert_relative_eq!(pos.elevation_deg, 0.0, epsilon = 0.01);
        assert_relative_eq!(pos.distance_m, 1.5, epsilon = 0.01);
    }

    #[test]
    fn test_full_rotation() {
        let engine = CircularMotionEngine::new(6.0, 1.5, 0.0, RotationDirection::Clockwise);
        
        // After 10 seconds at 6 RPM, should complete 1 revolution
        let pos_start = engine.calculate_position(0.0);
        let pos_end = engine.calculate_position(10.0);
        
        assert_relative_eq!(pos_start.azimuth_deg, pos_end.azimuth_deg, epsilon = 1.0);
    }

    #[test]
    fn test_quarter_rotation() {
        let engine = CircularMotionEngine::new(6.0, 1.5, 0.0, RotationDirection::Clockwise);
        
        // After 2.5 seconds at 6 RPM, should be at 90 degrees
        let pos = engine.calculate_position(2.5);
        assert_relative_eq!(pos.azimuth_deg, 90.0, epsilon = 1.0);
    }

    #[test]
    fn test_counterclockwise_direction() {
        let engine = CircularMotionEngine::new(6.0, 1.5, 0.0, RotationDirection::CounterClockwise);
        
        let pos = engine.calculate_position(2.5);
        // Counterclockwise should go to 270 degrees instead of 90
        assert_relative_eq!(pos.azimuth_deg, 270.0, epsilon = 1.0);
    }

    #[test]
    fn test_trajectory_length() {
        let engine = CircularMotionEngine::new(6.0, 1.5, 0.0, RotationDirection::Clockwise);
        let trajectory = engine.calculate_trajectory(48000, 1.0);
        
        assert_eq!(trajectory.len(), 48000);
    }

    #[test]
    fn test_elevation_preserved() {
        let engine = CircularMotionEngine::new(6.0, 1.5, 45.0, RotationDirection::Clockwise);
        let pos = engine.calculate_position(5.0);
        
        assert_relative_eq!(pos.elevation_deg, 45.0, epsilon = 0.01);
    }

    #[test]
    fn test_negative_time_handled() {
        let engine = CircularMotionEngine::new(6.0, 1.5, 0.0, RotationDirection::Clockwise);
        // Negative time should still produce valid position (wraps with modulo)
        let pos = engine.calculate_position(-1.0);
        
        assert!(pos.azimuth_deg >= 0.0 && pos.azimuth_deg <= 360.0);
        assert_eq!(pos.distance_m, 1.5);
    }

    #[test]
    fn test_very_high_speed() {
        // Test that very high rotation speeds don't break calculation
        let engine = CircularMotionEngine::new(1000.0, 1.5, 0.0, RotationDirection::Clockwise);
        let pos = engine.calculate_position(1.0);
        
        assert!(pos.azimuth_deg >= 0.0 && pos.azimuth_deg <= 360.0);
        assert!(pos.elevation_deg.abs() <= 90.0);
    }

    #[test]
    fn test_zero_radius() {
        // Zero radius is technically valid (source at listener position)
        let engine = CircularMotionEngine::new(6.0, 0.0, 0.0, RotationDirection::Clockwise);
        let pos = engine.calculate_position(1.0);
        
        assert_eq!(pos.distance_m, 0.0);
    }
}
