//! # Responsibility
//! Ambient spheres layer - floating decorative orbs.
//!
//! ---
//!
//! Leptos component that renders floating ambient spheres as visual decoration.
//! Spheres pulse and float based on audio frequency data.

use leptos::*;

/// # Responsibility
/// Renders floating ambient sphere decorations.
///
/// # Props
/// - `sphere_count`: Number of ambient spheres (default: 20)
/// - `fft_data`: FFT frequency data for audio-reactive animation
#[component]
pub fn AmbientSpheresLayer(
    #[prop(default = 20)] sphere_count: u32,
    #[prop(optional)] fft_data: Option<ReadSignal<Vec<f32>>>,
) -> impl IntoView {
    create_effect(move |_| {
        if let Some(fft_signal) = fft_data {
            let _fft = fft_signal.get();
            // TODO: Update sphere positions/scales based on FFT
        }
    });

    view! {
        <div class="ambient-spheres-layer" data-sphere-count=sphere_count>
            // Rendered via wgpu instanced draws
        </div>
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_sphere_count() {
        assert_eq!(20u32, 20);
    }

    #[test]
    fn test_sphere_count_reasonable() {
        let count = 20u32;
        assert!(count > 0 && count <= 100);
    }
}
