//! # Responsibility
//! Renders the Qualia Orb HUD component - visual representation of player state.
//!
//! ---
//!
//! Displays QualiaState as an animated orb with 4 quadrants (intensity, harmony, chaos, kairos).
//! Uses CSS transforms and Leptos reactive signals for real-time updates.
//! Animates pulsing based on intensity, color shifts based on harmony/chaos.

use leptos::*;
use shared_core::contracts::QualiaState;

/// # Responsibility
/// Props for Qualia Orb component.
#[derive(Clone, PartialEq)]
pub struct QualiaOrbProps {
    /// Current qualia state (reactive signal)
    pub state: ReadSignal<QualiaState>,
    /// Size in pixels (default: 200)
    pub size: u32,
}

/// # Responsibility
/// Renders Qualia Orb component with 4 quadrants.
///
/// ---
///
/// Visual Layout:
/// ```
///     HARMONY
///        ^
///        |
/// CHAOS <+> INTENSITY
///        |
///        v
///     KAIROS
/// ```
///
/// Each quadrant fills based on corresponding qualia value [0, 1].
/// Orb pulses at frequency = intensity * 2 Hz.
#[component]
pub fn QualiaOrb(
    /// Qualia state signal
    state: ReadSignal<QualiaState>,
    /// Orb size in pixels (optional, default 200)
    #[prop(default = 200)]
    size: u32,
) -> impl IntoView {
    // Reactive styles derived from state
    let orb_style = move || {
        let s = state.get();
        
        // Pulse animation frequency (0.5 Hz - 2 Hz)
        let pulse_freq = 0.5 + s.intensity * 1.5;
        
        // Base color from harmony/chaos balance
        let color = calculate_orb_color(s.harmony, s.chaos);
        
        format!(
            "width: {}px; height: {}px; background: {}; animation: pulse {}s ease-in-out infinite;",
            size, size, color, 1.0 / pulse_freq
        )
    };

    let intensity_fill = move || format!("height: {}%", state.get().intensity * 100.0);
    let harmony_fill = move || format!("width: {}%", state.get().harmony * 100.0);
    let chaos_fill = move || format!("width: {}%", state.get().chaos * 100.0);
    let kairos_fill = move || format!("height: {}%", state.get().kairos * 100.0);

    view! {
        <div class="qualia-orb-container">
            <div class="qualia-orb" style=orb_style>
                // Right quadrant: Intensity (red)
                <div class="quadrant intensity" style=intensity_fill></div>
                
                // Top quadrant: Harmony (blue)
                <div class="quadrant harmony" style=harmony_fill></div>
                
                // Left quadrant: Chaos (purple)
                <div class="quadrant chaos" style=chaos_fill></div>
                
                // Bottom quadrant: Kairos (gold)
                <div class="quadrant kairos" style=kairos_fill></div>
            </div>
            
            // Tooltip with numeric values
            <div class="qualia-tooltip">
                <span class="label">"Intensity: "</span>
                <span class="value">{move || format!("{:.0}%", state.get().intensity * 100.0)}</span>
                <br/>
                <span class="label">"Harmony: "</span>
                <span class="value">{move || format!("{:.0}%", state.get().harmony * 100.0)}</span>
                <br/>
                <span class="label">"Chaos: "</span>
                <span class="value">{move || format!("{:.0}%", state.get().chaos * 100.0)}</span>
                <br/>
                <span class="label">"Kairos: "</span>
                <span class="value">{move || format!("{:.0}%", state.get().kairos * 100.0)}</span>
            </div>
        </div>
    }
}

/// Calculates orb base color from harmony/chaos balance.
///
/// # Arguments
/// * `harmony` - Harmony value [0, 1]
/// * `chaos` - Chaos value [0, 1]
///
/// # Returns
/// CSS linear gradient string
fn calculate_orb_color(harmony: f32, chaos: f32) -> String {
    // Balance factor: high harmony → blue, high chaos → purple, balanced → cyan
    let balance = harmony - chaos; // Range: [-1, 1]
    
    let (r, g, b) = if balance > 0.0 {
        // Harmonious: blue tint
        let blue_factor = balance.abs().clamp(0.0, 1.0);
        (
            50 + (blue_factor * 50.0) as u8,
            100 + (blue_factor * 100.0) as u8,
            200,
        )
    } else {
        // Chaotic: purple/red tint
        let chaos_factor = balance.abs().clamp(0.0, 1.0);
        (
            150 + (chaos_factor * 105.0) as u8,
            50,
            150 + (chaos_factor * 50.0) as u8,
        )
    };

    format!("radial-gradient(circle, rgb({}, {}, {}), rgba(0, 0, 0, 0.5))", r, g, b)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_orb_color_harmonious() {
        let color = calculate_orb_color(0.9, 0.1);
        
        // High harmony → blue tint
        assert!(color.contains("radial-gradient"));
        assert!(color.contains("200")); // Blue channel high
    }

    #[test]
    fn test_calculate_orb_color_chaotic() {
        let color = calculate_orb_color(0.1, 0.9);
        
        // High chaos → purple/red tint
        assert!(color.contains("radial-gradient"));
        // Red/Purple channels higher than blue
    }

    #[test]
    fn test_calculate_orb_color_balanced() {
        let color = calculate_orb_color(0.5, 0.5);
        
        // Balanced → neutral color
        assert!(color.contains("radial-gradient"));
    }

    #[test]
    fn test_orb_color_range_clamping() {
        // Extreme values should not cause overflow
        let color1 = calculate_orb_color(1.0, 0.0);
        let color2 = calculate_orb_color(0.0, 1.0);
        
        // Both should produce valid CSS
        assert!(color1.starts_with("radial-gradient"));
        assert!(color2.starts_with("radial-gradient"));
    }
}
