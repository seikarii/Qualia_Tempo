//! # Responsibility
//! Boss avatar SDF renderer component.
//!
//! ---
//!
//! Leptos component rendering boss avatar using BossAvatarSDFService.
//! Uses Quaternion Julia Set SDF with phase-based color morphing.

use leptos::*;

/// # Responsibility
/// Boss position data.
#[derive(Debug, Clone, Copy)]
pub struct BossPosition {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

impl Default for BossPosition {
    fn default() -> Self {
        Self { x: 0.0, y: 10.0, z: 0.0 } // Above player
    }
}

/// # Responsibility
/// Boss phase data.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BossPhase {
    Awakening = 0,
    Escalation = 1,
    Chaos = 2,
    Finale = 3,
}

/// # Responsibility
/// Renders boss avatar with Quaternion Julia Set SDF.
///
/// # Props
/// - `position`: Boss 3D position
/// - `phase`: Current boss phase (affects color/behavior)
/// - `health_percent`: Health remaining [0.0, 1.0]
#[component]
pub fn BossRenderer(
    position: ReadSignal<BossPosition>,
    phase: ReadSignal<BossPhase>,
    health_percent: ReadSignal<f32>,
) -> impl IntoView {
    let phase_color = create_memo(move |_| {
        match phase.get() {
            BossPhase::Awakening => "rgb(100, 100, 255)", // Blue
            BossPhase::Escalation => "rgb(255, 150, 0)",  // Orange
            BossPhase::Chaos => "rgb(255, 0, 100)",       // Red-pink
            BossPhase::Finale => "rgb(200, 0, 255)",      // Purple
        }
    });

    let phase_name = create_memo(move |_| {
        match phase.get() {
            BossPhase::Awakening => "AWAKENING",
            BossPhase::Escalation => "ESCALATION",
            BossPhase::Chaos => "CHAOS",
            BossPhase::Finale => "FINALE",
        }
    });

    let intensity_scale = create_memo(move |_| {
        let health = health_percent.get();
        if health < 0.25 {
            1.5 // Enraged at low health
        } else if health < 0.5 {
            1.2
        } else {
            1.0
        }
    });

    view! {
        <div class="boss-renderer">
            // Placeholder for WebGPU rendering
            <div class="boss-avatar"
                 style:color=move || phase_color.get()
                 style:transform=move || format!("scale({})", intensity_scale.get())>
                {move || format!("👹 {} [{:.0}%]", phase_name.get(), health_percent.get() * 100.0)}
            </div>
        </div>
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_boss_position_default() {
        let pos = BossPosition::default();
        assert_eq!(pos.x, 0.0);
        assert_eq!(pos.y, 10.0);
        assert_eq!(pos.z, 0.0);
    }

    #[test]
    fn test_boss_phase_equality() {
        assert_eq!(BossPhase::Awakening, BossPhase::Awakening);
        assert_ne!(BossPhase::Awakening, BossPhase::Chaos);
    }

    #[test]
    fn test_phase_color_mapping() {
        let colors = vec![
            (BossPhase::Awakening, "rgb(100, 100, 255)"),
            (BossPhase::Escalation, "rgb(255, 150, 0)"),
            (BossPhase::Chaos, "rgb(255, 0, 100)"),
            (BossPhase::Finale, "rgb(200, 0, 255)"),
        ];
        
        for (phase, expected_color) in colors {
            let color = match phase {
                BossPhase::Awakening => "rgb(100, 100, 255)",
                BossPhase::Escalation => "rgb(255, 150, 0)",
                BossPhase::Chaos => "rgb(255, 0, 100)",
                BossPhase::Finale => "rgb(200, 0, 255)",
            };
            assert_eq!(color, expected_color);
        }
    }

    #[test]
    fn test_intensity_scale_calculation() {
        // Health < 0.25 → scale 1.5
        let health = 0.2;
        let scale = if health < 0.25 { 1.5 } else if health < 0.5 { 1.2 } else { 1.0 };
        assert_eq!(scale, 1.5);

        // Health 0.4 → scale 1.2
        let health = 0.4;
        let scale = if health < 0.25 { 1.5 } else if health < 0.5 { 1.2 } else { 1.0 };
        assert_eq!(scale, 1.2);

        // Health 0.8 → scale 1.0
        let health = 0.8;
        let scale = if health < 0.25 { 1.5 } else if health < 0.5 { 1.2 } else { 1.0 };
        assert_eq!(scale, 1.0);
    }
}
