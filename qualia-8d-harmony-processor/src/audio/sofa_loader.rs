//! # Responsibility
//! Loads and caches HRIR data from SOFA (Spatially Oriented Format for Acoustics) files.
//!
//! Supports MIT KEMAR and other AES69-2015 compliant SOFA datasets for binaural
//! audio spatialization.

use anyhow::{Context, Result, bail};
use std::collections::HashMap;
use std::path::Path;

/// Spherical position in 3D space
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SphericalCoord {
    pub azimuth_deg: f32,    // 0-360°, 0=front, 90=right
    pub elevation_deg: f32,  // -90 to +90°, 0=horizontal
    pub distance_m: f32,     // Meters from listener
}

impl SphericalCoord {
    pub fn new(azimuth_deg: f32, elevation_deg: f32, distance_m: f32) -> Self {
        Self {
            azimuth_deg: azimuth_deg % 360.0,
            elevation_deg: elevation_deg.clamp(-90.0, 90.0),
            distance_m: distance_m.max(0.0),
        }
    }

    /// Normalize azimuth to [0, 360) range
    pub fn normalize_azimuth(azimuth: f32) -> f32 {
        let mut normalized = azimuth % 360.0;
        if normalized < 0.0 {
            normalized += 360.0;
        }
        normalized
    }
}

/// HRIR (Head-Related Impulse Response) data for a specific position
#[derive(Debug, Clone)]
pub struct HrirData {
    pub position: SphericalCoord,
    pub left: Vec<f32>,
    pub right: Vec<f32>,
    pub sample_rate: u32,
}

impl HrirData {
    pub fn new(position: SphericalCoord, left: Vec<f32>, right: Vec<f32>, sample_rate: u32) -> Result<Self> {
        if left.len() != right.len() {
            bail!("HRIR left/right channels must have equal length");
        }
        Ok(Self {
            position,
            left,
            right,
            sample_rate,
        })
    }

    pub fn len(&self) -> usize {
        self.left.len()
    }

    pub fn is_empty(&self) -> bool {
        self.left.is_empty()
    }
}

/// SOFA dataset loader with HRIR caching and interpolation
pub struct SofaLoader {
    hrirs: HashMap<(i32, i32), HrirData>,  // (azimuth, elevation) -> HRIR
    sample_rate: u32,
    hrir_length: usize,
    available_positions: Vec<SphericalCoord>,
}

impl SofaLoader {
    /// Load SOFA dataset from file
    ///
    /// # Arguments
    /// * `path` - Path to SOFA file (.sofa)
    ///
    /// # Returns
    /// Loaded SOFA dataset with cached HRIRs
    pub fn load(path: &Path) -> Result<Self> {
        if !path.exists() {
            bail!("SOFA file not found: {:?}", path);
        }

        // TODO: Actual SOFA loading with sofar crate
        // For now, create a mock dataset with synthetic HRIRs
        Ok(Self::create_mock_dataset())
    }

    /// Create mock HRIR dataset for testing (24 azimuths × 3 elevations = 72 positions)
    pub fn create_mock_dataset() -> Self {
        let sample_rate = 48000;
        let hrir_length = 200; // Typical KEMAR HRIR length
        let mut hrirs = HashMap::new();
        let mut available_positions = Vec::new();

        // Generate synthetic HRIRs for standard positions
        // Azimuth: 0, 15, 30, ..., 345 (24 positions)
        // Elevation: -45, 0, 45 (3 positions)
        for azimuth in (0..360).step_by(15) {
            for elevation in [-45, 0, 45] {
                let position = SphericalCoord::new(azimuth as f32, elevation as f32, 1.5);
                
                // Create synthetic HRIR (simple delay + decay + ILD)
                let delay_samples = ((azimuth as f32 / 360.0) * 10.0) as usize;
                let mut left = vec![0.0; hrir_length];
                let mut right = vec![0.0; hrir_length];
                
                // ILD (Interaural Level Difference): Attenuate contralateral ear
                // Use sine wave for smooth left/right transition
                // Azimuth 0°: front → both equal (1.0, 1.0)
                // Azimuth 90°: left side → left loud (1.0), right quiet (0.3)
                // Azimuth 180°: back → both equal (1.0, 1.0)
                // Azimuth 270°: right side → right loud (1.0), left quiet (0.3)
                let azimuth_rad = (azimuth as f32).to_radians();
                let sin_az = azimuth_rad.sin();
                
                // Left ear: louder when azimuth=90° (left), quieter when azimuth=270° (right)
                let left_gain = if sin_az > 0.0 {
                    1.0 // Left hemisphere (0-180°): left ear dominant
                } else {
                    0.3 // Right hemisphere (180-360°): left ear attenuated
                };
                
                // Right ear: louder when azimuth=270° (right), quieter when azimuth=90° (left)
                let right_gain = if sin_az > 0.0 {
                    0.3 // Left hemisphere: right ear attenuated
                } else {
                    1.0 // Right hemisphere: right ear dominant
                };
                
                // Special case: front/back (azimuth near 0° or 180°)
                let (left_gain, right_gain) = if azimuth < 30 || azimuth > 330 || (azimuth > 150 && azimuth < 210) {
                    (1.0, 1.0) // Balanced for front/back
                } else {
                    (left_gain, right_gain)
                };
                
                // Left ear: delayed impulse
                if delay_samples < hrir_length {
                    left[delay_samples] = 0.8 * left_gain;
                    for i in delay_samples + 1..hrir_length.min(delay_samples + 50) {
                        left[i] = left[i - 1] * 0.9; // Exponential decay
                    }
                }
                
                // Right ear: slightly different delay (ITD simulation)
                let right_delay = if azimuth > 180 { 
                    delay_samples.saturating_sub(2) 
                } else { 
                    delay_samples + 2 
                };
                
                if right_delay < hrir_length {
                    right[right_delay] = 0.8 * right_gain;
                    for i in right_delay + 1..hrir_length.min(right_delay + 50) {
                        right[i] = right[i - 1] * 0.9;
                    }
                }
                
                let hrir_data = HrirData::new(position, left, right, sample_rate)
                    .expect("Failed to create synthetic HRIR");
                
                let key = (azimuth, elevation);
                hrirs.insert(key, hrir_data);
                available_positions.push(position);
            }
        }

        Self {
            hrirs,
            sample_rate,
            hrir_length,
            available_positions,
        }
    }

    /// Get HRIR for exact position (if available)
    pub fn get_exact(&self, azimuth_deg: f32, elevation_deg: f32) -> Option<&HrirData> {
        let az = azimuth_deg.round() as i32;
        let el = elevation_deg.round() as i32;
        self.hrirs.get(&(az, el))
    }

    /// Get HRIR with nearest-neighbor lookup
    pub fn get_nearest(&self, target: &SphericalCoord) -> Result<HrirData> {
        if self.hrirs.is_empty() {
            bail!("No HRIRs loaded");
        }

        // Find nearest position by angular distance
        let mut min_distance = f32::MAX;
        let mut nearest: Option<&HrirData> = None;

        for hrir in self.hrirs.values() {
            let distance = self.angular_distance(target, &hrir.position);
            if distance < min_distance {
                min_distance = distance;
                nearest = Some(hrir);
            }
        }

        nearest.cloned().context("Failed to find nearest HRIR")
    }

    /// Get interpolated HRIR between nearest positions
    pub fn get_interpolated(&self, target: &SphericalCoord) -> Result<HrirData> {
        // For simplicity, use nearest-neighbor for now
        // TODO: Implement proper VBAP (Vector Base Amplitude Panning) interpolation
        self.get_nearest(target)
    }

    /// Calculate angular distance between two spherical positions
    fn angular_distance(&self, a: &SphericalCoord, b: &SphericalCoord) -> f32 {
        // Simple Euclidean distance in spherical coordinates
        let az_diff = (a.azimuth_deg - b.azimuth_deg).abs();
        let az_dist = az_diff.min(360.0 - az_diff); // Handle wraparound
        let el_diff = (a.elevation_deg - b.elevation_deg).abs();
        
        (az_dist * az_dist + el_diff * el_diff).sqrt()
    }

    pub fn sample_rate(&self) -> u32 {
        self.sample_rate
    }

    pub fn hrir_length(&self) -> usize {
        self.hrir_length
    }

    pub fn available_positions(&self) -> &[SphericalCoord] {
        &self.available_positions
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn test_spherical_coord_creation() {
        let coord = SphericalCoord::new(45.0, 30.0, 1.5);
        assert_eq!(coord.azimuth_deg, 45.0);
        assert_eq!(coord.elevation_deg, 30.0);
        assert_eq!(coord.distance_m, 1.5);
    }

    #[test]
    fn test_spherical_coord_azimuth_wraparound() {
        let coord = SphericalCoord::new(370.0, 0.0, 1.0);
        assert_eq!(coord.azimuth_deg, 10.0);
    }

    #[test]
    fn test_spherical_coord_elevation_clamping() {
        let coord = SphericalCoord::new(0.0, 100.0, 1.0);
        assert_eq!(coord.elevation_deg, 90.0);
        
        let coord2 = SphericalCoord::new(0.0, -100.0, 1.0);
        assert_eq!(coord2.elevation_deg, -90.0);
    }

    #[test]
    fn test_hrir_data_creation() {
        let position = SphericalCoord::new(0.0, 0.0, 1.5);
        let left = vec![0.1, 0.2, 0.3];
        let right = vec![0.15, 0.25, 0.35];
        
        let hrir = HrirData::new(position, left.clone(), right.clone(), 48000).unwrap();
        assert_eq!(hrir.len(), 3);
        assert_eq!(hrir.sample_rate, 48000);
    }

    #[test]
    fn test_hrir_data_mismatched_lengths() {
        let position = SphericalCoord::new(0.0, 0.0, 1.5);
        let left = vec![0.1, 0.2];
        let right = vec![0.15, 0.25, 0.35];
        
        let result = HrirData::new(position, left, right, 48000);
        assert!(result.is_err());
    }

    #[test]
    fn test_sofa_loader_mock_creation() {
        let loader = SofaLoader::create_mock_dataset();
        
        assert_eq!(loader.sample_rate(), 48000);
        assert_eq!(loader.hrir_length(), 200);
        assert!(!loader.available_positions().is_empty());
    }

    #[test]
    fn test_sofa_loader_get_exact() {
        let loader = SofaLoader::create_mock_dataset();
        
        let hrir = loader.get_exact(0.0, 0.0);
        assert!(hrir.is_some());
        
        let hrir = loader.get_exact(45.0, 0.0);
        assert!(hrir.is_some());
        
        // Non-existent position
        let hrir = loader.get_exact(7.5, 0.0);
        assert!(hrir.is_none());
    }

    #[test]
    fn test_sofa_loader_get_nearest() {
        let loader = SofaLoader::create_mock_dataset();
        
        // Request position between grid points
        let target = SphericalCoord::new(7.0, 1.0, 1.5);
        let hrir = loader.get_nearest(&target).unwrap();
        
        // Should snap to nearest (0° or 15°)
        assert!(hrir.position.azimuth_deg == 0.0 || hrir.position.azimuth_deg == 15.0);
    }

    #[test]
    fn test_angular_distance() {
        let loader = SofaLoader::create_mock_dataset();
        
        let a = SphericalCoord::new(0.0, 0.0, 1.5);
        let b = SphericalCoord::new(0.0, 0.0, 1.5);
        
        let dist = loader.angular_distance(&a, &b);
        assert_relative_eq!(dist, 0.0, epsilon = 0.001);
        
        // Test azimuth distance
        let c = SphericalCoord::new(90.0, 0.0, 1.5);
        let dist2 = loader.angular_distance(&a, &c);
        assert_relative_eq!(dist2, 90.0, epsilon = 0.001);
    }

    #[test]
    fn test_azimuth_wraparound_distance() {
        let loader = SofaLoader::create_mock_dataset();
        
        let a = SphericalCoord::new(350.0, 0.0, 1.5);
        let b = SphericalCoord::new(10.0, 0.0, 1.5);
        
        let dist = loader.angular_distance(&a, &b);
        // Should be 20° (via wraparound), not 340°
        assert!(dist < 30.0);
    }
}
