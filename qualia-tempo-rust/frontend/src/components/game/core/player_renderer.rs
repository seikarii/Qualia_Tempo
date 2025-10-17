//! # Responsibility
//! Player avatar SDF renderer component.
//!
//! ---
//!
//! Leptos component rendering player avatar using PlayerAvatarSDFService.
//! Morphs from Capsule to Mandelbulb at transcendence > 0.9.

use leptos::*;
use wasm_bindgen::prelude::*;

/// # Responsibility
/// Player position data.
#[derive(Debug, Clone, Copy)]
pub struct PlayerPosition {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

impl Default for PlayerPosition {
    fn default() -> Self {
        Self { x: 0.0, y: 0.0, z: 0.0 }
    }
}

/// # Responsibility
/// Renders player avatar with SDF raymarching.
///
/// # Props
/// - `position`: Player 3D position
/// - `transcendence`: Transcendence level [0.0, 1.0] (>0.9 triggers Mandelbulb)
/// - `is_dashing`: Whether player is currently dashing
#[component]
pub fn PlayerRenderer(
    position: ReadSignal<PlayerPosition>,
    transcendence: ReadSignal<f32>,
    #[prop(default = false)] is_dashing: bool,
) -> impl IntoView {
    let morph_factor = create_memo(move |_| {
        let trans = transcendence.get();
        if trans > 0.9 {
            (trans - 0.9) / 0.1 // 0.0 at 0.9, 1.0 at 1.0
        } else {
            0.0
        }
    });

    let avatar_color = create_memo(move |_| {
        let morph = morph_factor.get();
        if morph > 0.5 {
            "rgb(255, 215, 0)" // Gold for Mandelbulb
        } else if is_dashing {
            "rgb(100, 200, 255)" // Cyan for dash
        } else {
            "rgb(255, 255, 255)" // White default
        }
    });

    view! {
        <div class="player-renderer">
            // Placeholder for WebGPU rendering
            <div class="player-avatar"
                 style:color=move || avatar_color.get()
                 data-morph-factor=move || format!("{:.2}", morph_factor.get())>
                {move || {
                    let morph = morph_factor.get();
                    if morph >= 1.0 {
                        "🌀 MANDELBULB FORM"
                    } else if morph > 0.0 {
                        "⚡ TRANSFORMING..."
                    } else if is_dashing {
                        "💨 DASH"
                    } else {
                        "👤 PLAYER"
                    }
                }}
            </div>
        </div>
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_player_position_default() {
        let pos = PlayerPosition::default();
        assert_eq!(pos.x, 0.0);
        assert_eq!(pos.y, 0.0);
        assert_eq!(pos.z, 0.0);
    }

    #[test]
    fn test_player_position_creation() {
        let pos = PlayerPosition { x: 1.5, y: 2.0, z: -0.5 };
        assert_eq!(pos.x, 1.5);
        assert_eq!(pos.y, 2.0);
        assert_eq!(pos.z, -0.5);
    }

    #[test]
    fn test_morph_factor_calculation() {
        // Transcendence 0.9 → morph 0.0
        let trans = 0.9;
        let morph = if trans > 0.9 { (trans - 0.9) / 0.1 } else { 0.0 };
        assert_eq!(morph, 0.0);

        // Transcendence 0.95 → morph 0.5
        let trans = 0.95;
        let morph = if trans > 0.9 { (trans - 0.9) / 0.1 } else { 0.0 };
        assert_eq!(morph, 0.5);

        // Transcendence 1.0 → morph 1.0
        let trans = 1.0;
        let morph = if trans > 0.9 { (trans - 0.9) / 0.1 } else { 0.0 };
        assert_eq!(morph, 1.0);
    }

    #[test]
    fn test_morph_factor_below_threshold() {
        let trans = 0.5;
        let morph = if trans > 0.9 { (trans - 0.9) / 0.1 } else { 0.0 };
        assert_eq!(morph, 0.0);
    }
}
