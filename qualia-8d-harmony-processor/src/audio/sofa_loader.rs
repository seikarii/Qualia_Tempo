//! # Responsibility
//! Loads and caches HRIR data from SOFA (Spatially Oriented Format for Acoustics) files.
//!
//! Supports MIT KEMAR and other AES69-2015 compliant SOFA datasets for binaural
//! audio spatialization.

use anyhow::{Context, Result, bail};
use sofar::reader::{Sofar, Filter};
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

/// Convert spherical coordinates to Cartesian (x, y, z)
///
/// SOFA/libmysofa convention:
/// - x: front/back axis (positive = front)
/// - y: left/right axis (positive = left)
/// - z: up/down axis (positive = up)
fn spherical_to_cartesian(azimuth_deg: f32, elevation_deg: f32, radius_m: f32) -> (f32, f32, f32) {
    let az_rad = azimuth_deg.to_radians();
    let el_rad = elevation_deg.to_radians();
    
    let x = radius_m * el_rad.cos() * az_rad.cos();
    let y = radius_m * el_rad.cos() * az_rad.sin();
    let z = radius_m * el_rad.sin();
    
    (x, y, z)
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

        // Load SOFA file using sofar crate (libmysofa wrapper)
        let sofar_handle = Sofar::open(path)
            .with_context(|| format!("Failed to open SOFA file: {:?}", path))?;

        let hrir_length = sofar_handle.filter_len();
        
        // Assume 48kHz sample rate (SOFA files don't always expose this in sofar API)
        // User can override via OpenOptions if needed
        let sample_rate = 48000u32;

        tracing::info!(
            hrir_length,
            sample_rate,
            "Loaded SOFA file (libmysofa)"
        );

        // Build HRIR cache by sampling the sphere
        // Standard KEMAR positions: 24 azimuths × 3 elevations
        let mut hrirs = HashMap::new();
        let mut available_positions = Vec::new();

        for azimuth in (0..360).step_by(15) {
            for elevation in [-45, 0, 45] {
                let position = SphericalCoord::new(azimuth as f32, elevation as f32, 1.5);
                
                // Convert spherical to Cartesian for sofar API
                let (x, y, z) = spherical_to_cartesian(
                    position.azimuth_deg,
                    position.elevation_deg,
                    position.distance_m,
                );

                // Query HRIR from sofar (libmysofa handles interpolation internally)
                let mut filter = Filter::new(hrir_length);
                sofar_handle.filter(x, y, z, &mut filter);

                // Extract left/right channels (sofar::Filter uses Box<[f32]>)
                let left = filter.left.to_vec();
                let right = filter.right.to_vec();

                let hrir_data = HrirData::new(position, left, right, sample_rate)
                    .with_context(|| format!("Failed to create HRIR for az={} el={}", azimuth, elevation))?;

                let key = (azimuth, elevation);
                hrirs.insert(key, hrir_data);
                available_positions.push(position);
            }
        }

        if hrirs.is_empty() {
            bail!("No valid HRIRs extracted from SOFA file");
        }

        tracing::info!(num_positions = hrirs.len(), "HRIR cache built");

        Ok(Self {
            hrirs,
            sample_rate,
            hrir_length,
            available_positions,
        })
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
    ///
    /// Uses bilinear interpolation in the azimuth/elevation grid for smooth transitions.
    pub fn get_interpolated(&self, target: &SphericalCoord) -> Result<HrirData> {
        if self.hrirs.is_empty() {
            bail!("No HRIRs loaded");
        }

        // Find 4 nearest neighbors in azimuth/elevation grid
        let az = SphericalCoord::normalize_azimuth(target.azimuth_deg);
        let el = target.elevation_deg.clamp(-90.0, 90.0);

        // Round to grid points (assumes 15° azimuth, 45° elevation steps)
        let az_floor = (az / 15.0).floor() * 15.0;
        let az_ceil = ((az / 15.0).ceil() * 15.0) % 360.0;
        
        let el_floor = if el < -45.0 {
            -45.0
        } else if el < 0.0 {
            -45.0
        } else if el < 45.0 {
            0.0
        } else {
            45.0
        };
        
        let el_ceil = if el_floor < 0.0 {
            0.0
        } else if el_floor == 0.0 {
            45.0
        } else {
            45.0
        };

        // Fetch 4 corner HRIRs
        let hrir_00 = self.hrirs.get(&(az_floor as i32, el_floor as i32));
        let hrir_10 = self.hrirs.get(&(az_ceil as i32, el_floor as i32));
        let hrir_01 = self.hrirs.get(&(az_floor as i32, el_ceil as i32));
        let hrir_11 = self.hrirs.get(&(az_ceil as i32, el_ceil as i32));

        // If any corner is missing, fall back to nearest neighbor
        if hrir_00.is_none() || hrir_10.is_none() || hrir_01.is_none() || hrir_11.is_none() {
            tracing::debug!("HRTF interpolation: missing grid point, using nearest neighbor");
            return self.get_nearest(target);
        }

        // Bilinear interpolation weights
        let az_weight = if az_ceil == az_floor {
            0.0
        } else {
            (az - az_floor) / (az_ceil - az_floor)
        };
        
        let el_weight = if el_ceil == el_floor {
            0.0
        } else {
            (el - el_floor) / (el_ceil - el_floor)
        };

        // Interpolate left/right channels
        let hrir_00 = hrir_00.unwrap();
        let hrir_10 = hrir_10.unwrap();
        let hrir_01 = hrir_01.unwrap();
        let hrir_11 = hrir_11.unwrap();

        let hrir_len = hrir_00.len();
        let mut left = vec![0.0; hrir_len];
        let mut right = vec![0.0; hrir_len];

        for i in 0..hrir_len {
            // Bilinear interpolation: f(x,y) = (1-x)(1-y)f00 + x(1-y)f10 + (1-x)y f01 + xy f11
            let w00 = (1.0 - az_weight) * (1.0 - el_weight);
            let w10 = az_weight * (1.0 - el_weight);
            let w01 = (1.0 - az_weight) * el_weight;
            let w11 = az_weight * el_weight;

            left[i] = w00 * hrir_00.left[i] 
                    + w10 * hrir_10.left[i] 
                    + w01 * hrir_01.left[i] 
                    + w11 * hrir_11.left[i];

            right[i] = w00 * hrir_00.right[i] 
                     + w10 * hrir_10.right[i] 
                     + w01 * hrir_01.right[i] 
                     + w11 * hrir_11.right[i];
        }

        HrirData::new(*target, left, right, self.sample_rate)
    }

    /// Calculate angular distance between two spherical positions
    fn angular_distance(&self, a: &SphericalCoord, b: &SphericalCoord) -> f32 {
        // Simple Euclidean distance in spherical coordinates
        let az_diff = (a.azimuth_deg - b.azimuth_deg).abs();
        let az_dist = az_diff.min(360.0 - az_diff); // Handle wraparound
        let el_diff = (a.elevation_deg - b.elevation_deg).abs();
        
        (az_dist * az_dist + el_diff * el_diff).sqrt()
    }

    /// Load SOFA file with fallback to mock dataset
    ///
    /// Attempts to load real SOFA file. If file doesn't exist or fails to parse,
    /// falls back to mock dataset with warning.
    pub fn load_or_mock(path: &Path) -> Self {
        match Self::load(path) {
            Ok(loader) => {
                tracing::info!("Loaded real SOFA dataset from {:?}", path);
                loader
            }
            Err(e) => {
                tracing::warn!(
                    error = %e,
                    "Failed to load SOFA file, using mock dataset"
                );
                Self::create_mock_dataset()
            }
        }
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

    #[test]
    fn test_hrtf_interpolation_between_grid_points() {
        let loader = SofaLoader::create_mock_dataset();
        
        // Request HRIR at position between grid points (7.5° azimuth, 0° elevation)
        // Should interpolate between 0° and 15° azimuth
        let target = SphericalCoord::new(7.5, 0.0, 1.5);
        let interpolated = loader.get_interpolated(&target).unwrap();
        
        // Verify interpolated HRIR has correct length
        assert_eq!(interpolated.len(), 200);
        
        // Get corner HRIRs for comparison
        let hrir_0 = loader.get_exact(0.0, 0.0).unwrap();
        let hrir_15 = loader.get_exact(15.0, 0.0).unwrap();
        
        // Interpolated value at midpoint should be roughly average of corners
        // Check first non-zero sample
        let sample_idx = 5;
        let interpolated_val = interpolated.left[sample_idx];
        let avg_val = (hrir_0.left[sample_idx] + hrir_15.left[sample_idx]) / 2.0;
        
        // Allow 20% tolerance due to bilinear weighting
        assert!(
            (interpolated_val - avg_val).abs() < 0.2,
            "Interpolated HRIR should be blend of neighbors: {} vs {} (avg)",
            interpolated_val,
            avg_val
        );
    }

    #[test]
    fn test_hrtf_interpolation_at_grid_point() {
        let loader = SofaLoader::create_mock_dataset();
        
        // Request HRIR exactly at grid point (30° azimuth, 0° elevation)
        let target = SphericalCoord::new(30.0, 0.0, 1.5);
        let interpolated = loader.get_interpolated(&target).unwrap();
        let exact = loader.get_exact(30.0, 0.0).unwrap();
        
        // Interpolation at exact grid point should match exact HRIR
        for i in 0..interpolated.len().min(10) {
            assert_relative_eq!(
                interpolated.left[i],
                exact.left[i],
                epsilon = 0.001
            );
        }
    }
}
