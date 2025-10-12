//! # Responsibility
//! Biquad IIR filter implementation for audio DSP.
//!
//! ---
//!
//! Provides second-order IIR filters using Direct Form 1 implementation.
//! Coefficients calculated using Audio EQ Cookbook formulas.

use std::f32::consts::PI;

/// # Responsibility
/// Second-order IIR biquad filter for stereo audio.
///
/// ---
///
/// Uses Direct Form 1: y[n] = b0*x[n] + b1*x[n-1] + b2*x[n-2] - a1*y[n-1] - a2*y[n-2]
/// Maintains separate state for left and right channels to preserve stereo image.
#[derive(Debug, Clone)]
pub struct BiquadFilter {
    // Normalized coefficients (divided by a0)
    b0: f32,
    b1: f32,
    b2: f32,
    a1: f32,
    a2: f32,

    // State for left channel
    x1_left: f32,
    x2_left: f32,
    y1_left: f32,
    y2_left: f32,

    // State for right channel
    x1_right: f32,
    x2_right: f32,
    y1_right: f32,
    y2_right: f32,
}

impl BiquadFilter {
    /// Create a low-shelf filter.
    ///
    /// # Arguments
    /// * `sample_rate` - Sample rate in Hz
    /// * `corner_freq` - Corner frequency in Hz (boost below this)
    /// * `db_gain` - Gain in dB (positive = boost, negative = cut)
    /// * `shelf_slope` - Slope parameter (0.5-2.0, default 0.7)
    pub fn low_shelf(sample_rate: u32, corner_freq: f32, db_gain: f32, shelf_slope: f32) -> Self {
        let a = 10_f32.powf(db_gain / 40.0);
        let w0 = 2.0 * PI * corner_freq / sample_rate as f32;
        let cos_w0 = w0.cos();
        let sin_w0 = w0.sin();

        let alpha = (sin_w0 / 2.0) * ((a + 1.0 / a) * (1.0 / shelf_slope - 1.0) + 2.0).sqrt();
        let sqrt_a = a.sqrt();
        let two_sqrt_a_alpha = 2.0 * sqrt_a * alpha;

        let b0 = a * ((a + 1.0) - (a - 1.0) * cos_w0 + two_sqrt_a_alpha);
        let b1 = 2.0 * a * ((a - 1.0) - (a + 1.0) * cos_w0);
        let b2 = a * ((a + 1.0) - (a - 1.0) * cos_w0 - two_sqrt_a_alpha);
        let a0 = (a + 1.0) + (a - 1.0) * cos_w0 + two_sqrt_a_alpha;
        let a1 = -2.0 * ((a - 1.0) + (a + 1.0) * cos_w0);
        let a2 = (a + 1.0) + (a - 1.0) * cos_w0 - two_sqrt_a_alpha;

        // Normalize by a0
        Self {
            b0: b0 / a0,
            b1: b1 / a0,
            b2: b2 / a0,
            a1: a1 / a0,
            a2: a2 / a0,
            x1_left: 0.0,
            x2_left: 0.0,
            y1_left: 0.0,
            y2_left: 0.0,
            x1_right: 0.0,
            x2_right: 0.0,
            y1_right: 0.0,
            y2_right: 0.0,
        }
    }

    /// Create a peaking EQ filter.
    ///
    /// # Arguments
    /// * `sample_rate` - Sample rate in Hz
    /// * `center_freq` - Center frequency in Hz
    /// * `db_gain` - Gain in dB (positive = boost, negative = cut)
    /// * `q` - Q factor (bandwidth control, higher = narrower)
    pub fn peaking_eq(sample_rate: u32, center_freq: f32, db_gain: f32, q: f32) -> Self {
        let a = 10_f32.powf(db_gain / 40.0);
        let w0 = 2.0 * PI * center_freq / sample_rate as f32;
        let cos_w0 = w0.cos();
        let sin_w0 = w0.sin();

        let alpha = sin_w0 / (2.0 * q);

        let b0 = 1.0 + alpha * a;
        let b1 = -2.0 * cos_w0;
        let b2 = 1.0 - alpha * a;
        let a0 = 1.0 + alpha / a;
        let a1 = -2.0 * cos_w0;
        let a2 = 1.0 - alpha / a;

        // Normalize by a0
        Self {
            b0: b0 / a0,
            b1: b1 / a0,
            b2: b2 / a0,
            a1: a1 / a0,
            a2: a2 / a0,
            x1_left: 0.0,
            x2_left: 0.0,
            y1_left: 0.0,
            y2_left: 0.0,
            x1_right: 0.0,
            x2_right: 0.0,
            y1_right: 0.0,
            y2_right: 0.0,
        }
    }

    /// Process a stereo frame through the filter.
    ///
    /// # Arguments
    /// * `frame` - Stereo frame [left, right]
    ///
    /// Direct Form 1: y[n] = b0*x[n] + b1*x[n-1] + b2*x[n-2] - a1*y[n-1] - a2*y[n-2]
    pub fn process_frame(&mut self, frame: &mut [f32; 2]) {
        // Process left channel
        let x_left = frame[0];
        let y_left = self.b0 * x_left + self.b1 * self.x1_left + self.b2 * self.x2_left
            - self.a1 * self.y1_left
            - self.a2 * self.y2_left;

        // Update left state
        self.x2_left = self.x1_left;
        self.x1_left = x_left;
        self.y2_left = self.y1_left;
        self.y1_left = y_left;

        // Process right channel
        let x_right = frame[1];
        let y_right = self.b0 * x_right + self.b1 * self.x1_right + self.b2 * self.x2_right
            - self.a1 * self.y1_right
            - self.a2 * self.y2_right;

        // Update right state
        self.x2_right = self.x1_right;
        self.x1_right = x_right;
        self.y2_right = self.y1_right;
        self.y1_right = y_right;

        // Write filtered output
        frame[0] = y_left;
        frame[1] = y_right;
    }

    /// Reset filter state to zero.
    pub fn reset(&mut self) {
        self.x1_left = 0.0;
        self.x2_left = 0.0;
        self.y1_left = 0.0;
        self.y2_left = 0.0;
        self.x1_right = 0.0;
        self.x2_right = 0.0;
        self.y1_right = 0.0;
        self.y2_right = 0.0;
    }
}
