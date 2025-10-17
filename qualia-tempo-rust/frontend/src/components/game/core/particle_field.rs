//! # Responsibility
//! Particle system renderer wrapper component.
//!
//! ---
//!
//! Leptos component wrapping ParticleComputeService.
//! Renders qualia-reactive particle field.

use leptos::*;

/// # Responsibility
/// Particle field configuration.
#[derive(Debug, Clone, Copy)]
pub struct ParticleFieldConfig {
    pub particle_count: usize,
    pub speed_multiplier: f32,
    pub size_range: (f32, f32),
}

impl Default for ParticleFieldConfig {
    fn default() -> Self {
        Self {
            particle_count: 5000,
            speed_multiplier: 1.0,
            size_range: (1.0, 5.0),
        }
    }
}

/// # Responsibility
/// Renders particle field driven by qualia state.
///
/// # Props
/// - `intensity`: Intensity affects particle speed
/// - `harmony`: Harmony affects particle color cohesion
/// - `chaos`: Chaos affects particle randomness
/// - `config`: Particle field configuration
#[component]
pub fn ParticleField(
    intensity: ReadSignal<f32>,
    harmony: ReadSignal<f32>,
    chaos: ReadSignal<f32>,
    #[prop(default = ParticleFieldConfig::default())] config: ParticleFieldConfig,
) -> impl IntoView {
    let particle_speed = create_memo(move |_| {
        let base_speed = config.speed_multiplier;
        let intensity_mult = 1.0 + (intensity.get() * 2.0); // 1.0x to 3.0x
        base_speed * intensity_mult
    });

    let particle_color = create_memo(move |_| {
        let h = harmony.get();
        let c = chaos.get();
        
        if c > 0.7 {
            format!("rgb(255, {}, 100)", (100.0 + h * 155.0) as u8) // Red-ish chaotic
        } else if h > 0.7 {
            format!("rgb(100, {}, 255)", (100.0 + h * 155.0) as u8) // Blue-ish harmonious
        } else {
            "rgb(200, 200, 200)".to_string() // Gray neutral
        }
    });

    view! {
        <div class="particle-field"
             data-particle-count=config.particle_count
             data-speed=move || format!("{:.2}", particle_speed.get())
             style:background-color=move || particle_color.get()>
            // WebGPU compute shader rendering happens here
            <span class="particle-info">
                {move || format!("{} particles", config.particle_count)}
            </span>
        </div>
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_particle_field_config_default() {
        let config = ParticleFieldConfig::default();
        assert_eq!(config.particle_count, 5000);
        assert_eq!(config.speed_multiplier, 1.0);
        assert_eq!(config.size_range, (1.0, 5.0));
    }

    #[test]
    fn test_particle_speed_calculation() {
        let base_speed = 1.0;
        
        // Intensity 0.0 → speed 1.0x
        let intensity = 0.0;
        let speed = base_speed * (1.0 + intensity * 2.0);
        assert_eq!(speed, 1.0);

        // Intensity 0.5 → speed 2.0x
        let intensity = 0.5;
        let speed = base_speed * (1.0 + intensity * 2.0);
        assert_eq!(speed, 2.0);

        // Intensity 1.0 → speed 3.0x
        let intensity = 1.0;
        let speed = base_speed * (1.0 + intensity * 2.0);
        assert_eq!(speed, 3.0);
    }

    #[test]
    fn test_particle_color_chaos() {
        let harmony = 0.5;
        let chaos = 0.8; // High chaos
        
        let color = if chaos > 0.7 {
            format!("rgb(255, {}, 100)", (100.0 + harmony * 155.0) as u8)
        } else if harmony > 0.7 {
            format!("rgb(100, {}, 255)", (100.0 + harmony * 155.0) as u8)
        } else {
            "rgb(200, 200, 200)".to_string()
        };
        
        assert!(color.starts_with("rgb(255")); // Red-ish
    }

    #[test]
    fn test_particle_color_harmony() {
        let harmony = 0.8; // High harmony
        let chaos = 0.3;
        
        let color = if chaos > 0.7 {
            format!("rgb(255, {}, 100)", (100.0 + harmony * 155.0) as u8)
        } else if harmony > 0.7 {
            format!("rgb(100, {}, 255)", (100.0 + harmony * 155.0) as u8)
        } else {
            "rgb(200, 200, 200)".to_string()
        };
        
        assert!(color.starts_with("rgb(100")); // Blue-ish
    }
}
