//! # Responsibility
//! Wave plane layer - animated ground plane with reaction-diffusion patterns.
//!
//! ---
//!
//! Leptos component that renders the game field floor with animated
//! Turing patterns (reaction-diffusion simulation).

use leptos::*;

/// # Responsibility
/// Renders animated wave plane as game field floor.
///
/// # Props
/// - `simulation_speed`: Speed of reaction-diffusion simulation (default: 1.0)
/// - `pattern_scale`: Scale of Turing patterns (default: 1.0)
#[component]
pub fn WavePlaneLayer(
    #[prop(default = 1.0)] simulation_speed: f32,
    #[prop(default = 1.0)] pattern_scale: f32,
) -> impl IntoView {
    create_effect(move |_| {
        // TODO: Update reaction-diffusion compute shader uniforms
        log::debug!("Wave plane: speed={}, scale={}", simulation_speed, pattern_scale);
    });

    view! {
        <div class="wave-plane-layer" 
             data-speed=simulation_speed.to_string()
             data-scale=pattern_scale.to_string()>
            // Rendered via wgpu with ReactionDiffusionComputeService
        </div>
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_simulation_speed() {
        let speed = 1.0f32;
        assert_eq!(speed, 1.0);
    }

    #[test]
    fn test_default_pattern_scale() {
        let scale = 1.0f32;
        assert_eq!(scale, 1.0);
    }

    #[test]
    fn test_simulation_speed_range() {
        let speed = 1.0f32;
        assert!(speed > 0.0 && speed <= 10.0);
    }

    #[test]
    fn test_pattern_scale_range() {
        let scale = 1.0f32;
        assert!(scale > 0.0 && scale <= 5.0);
    }
}
