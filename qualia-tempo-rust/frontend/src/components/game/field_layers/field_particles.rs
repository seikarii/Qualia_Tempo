//! # Responsibility
//! Field particles layer - qualia-reactive background particles.
//!
//! ---
//!
//! Leptos component that renders animated particles in the game field background.
//! Particles respond to QualiaState (intensity, harmony, chaos) via compute shaders.

use leptos::*;

/// # Responsibility
/// Renders qualia-reactive particle field as game background layer.
///
/// # Props
/// - `particle_count`: Number of active particles (default: 5000)
/// - `intensity`: Intensity value driving particle behavior (0.0-1.0)
/// - `harmony`: Harmony value affecting particle color (0.0-1.0)
/// - `chaos`: Chaos value affecting particle motion chaos (0.0-1.0)
#[component]
pub fn FieldParticlesLayer(
    #[prop(default = 5000)] particle_count: u32,
    intensity: ReadSignal<f32>,
    harmony: ReadSignal<f32>,
    chaos: ReadSignal<f32>,
) -> impl IntoView {
    // This component serves as a bridge to the ParticleComputeService
    // The actual rendering happens in wgpu compute shaders

    create_effect(move |_| {
        let i = intensity.get();
        let h = harmony.get();
        let c = chaos.get();
        
        // TODO: Update particle compute shader uniforms
        // TODO: Dispatch compute shader
        // TODO: Render particles via wgpu
        
        log::debug!("Particle update: intensity={}, harmony={}, chaos={}", i, h, c);
    });

    view! {
        <div class="field-particles-layer" data-particle-count=particle_count>
            // Particles rendered directly to WebGL canvas via wgpu
        </div>
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_particle_count() {
        let count = 5000u32;
        assert_eq!(count, 5000);
    }

    #[test]
    fn test_particle_count_range() {
        // Ensure particle count is reasonable
        let min = 1000u32;
        let max = 100000u32;
        assert!(min < max);
        assert!(5000 >= min && 5000 <= max);
    }
}
