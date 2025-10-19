//! # Responsibility
//! Generates 3D spherical positions for circular motion over time.

use std::f32::consts::PI;

#[derive(Debug, Clone)]
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

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SphericalPosition {
    pub azimuth_deg: f32,      // 0-360°, 0=front, 90=right
    pub elevation_deg: f32,    // -90 to +90°, 0=horizontal
    pub distance_m: f32,       // Meters from listener
}

impl CircularMotionEngine {
    pub fn new(rotation_speed_rpm: f32, radius_meters: f32, elevation_degrees: f32, direction: RotationDirection) -> Self {
        Self {
            rotation_speed_rpm,
            radius_meters,
            elevation_degrees,
            direction,
        }
    }

    pub fn calculate_position(&self, time_sec: f64) -> SphericalPosition {
        let omega = self.rotation_speed_rpm * 2.0 * PI / 60.0; // rad/s
        let theta = (omega * time_sec as f32) % (2.0 * PI);
        
        let theta_deg = match self.direction {
            RotationDirection::Clockwise => theta.to_degrees(),
            RotationDirection::CounterClockwise => 360.0 - theta.to_degrees(),
        };
        
        SphericalPosition {
            azimuth_deg: theta_deg,
            elevation_deg: self.elevation_degrees,
            distance_m: self.radius_meters,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn test_circular_motion_at_zero_time() {
        let engine = CircularMotionEngine::new(
            6.0,  // 6 RPM
            1.5,  // 1.5m radius
            0.0,  // horizontal
            RotationDirection::Clockwise,
        );

        let pos = engine.calculate_position(0.0);
        assert_relative_eq!(pos.azimuth_deg, 0.0, epsilon = 0.01);
        assert_relative_eq!(pos.elevation_deg, 0.0, epsilon = 0.01);
        assert_relative_eq!(pos.distance_m, 1.5, epsilon = 0.01);
    }

    #[test]
    fn test_full_rotation() {
        let engine = CircularMotionEngine::new(
            60.0,  // 60 RPM = 1 rotation per second
            1.0,
            0.0,
            RotationDirection::Clockwise,
        );

        let pos_at_1s = engine.calculate_position(1.0);
        // After 1 second at 60 RPM, should be back at 0 degrees
        assert_relative_eq!(pos_at_1s.azimuth_deg % 360.0, 0.0, epsilon = 0.1);
    }

    #[test]
    fn test_counter_clockwise_direction() {
        let engine = CircularMotionEngine::new(
            60.0,
            1.0,
            0.0,
            RotationDirection::CounterClockwise,
        );

        let pos_quarter = engine.calculate_position(0.25);
        // Quarter rotation counterclockwise should be at 270 degrees
        assert!((pos_quarter.azimuth_deg - 270.0).abs() < 1.0);
    }

    #[test]
    fn test_elevation_preservation() {
        let engine = CircularMotionEngine::new(
            6.0,
            1.5,
            30.0,  // 30 degrees elevation
            RotationDirection::Clockwise,
        );

        let pos = engine.calculate_position(5.0);
        assert_relative_eq!(pos.elevation_deg, 30.0, epsilon = 0.01);
    }

    #[test]
    fn test_distance_preservation() {
        let engine = CircularMotionEngine::new(
            6.0,
            2.5,
            0.0,
            RotationDirection::Clockwise,
        );

        let pos = engine.calculate_position(10.0);
        assert_relative_eq!(pos.distance_m, 2.5, epsilon = 0.01);
    }
}
