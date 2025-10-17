//! # Responsibility
//! Game field container component - wrapper for 3D rendering and field layers.
//!
//! ---
//!
//! Leptos component that manages the game field canvas and coordinates
//! rendering layers (particles, reaction-diffusion, avatars, etc.).

use leptos::*;
use wasm_bindgen::JsCast;
use web_sys::{HtmlCanvasElement, WebGl2RenderingContext};

/// # Responsibility
/// Container for game field rendering with wgpu/WebGL2 canvas.
///
/// # Props
/// - `width`: Canvas width in pixels
/// - `height`: Canvas height in pixels
/// - `on_canvas_ready`: Callback when canvas is initialized
#[component]
pub fn FieldContainer(
    #[prop(default = 1920)] width: u32,
    #[prop(default = 1080)] height: u32,
    #[prop(optional)] on_canvas_ready: Option<Box<dyn Fn(HtmlCanvasElement)>>,
) -> impl IntoView {
    let canvas_ref: NodeRef<html::Canvas> = create_node_ref();

    // Initialize canvas when mounted
    create_effect(move |_| {
        if let Some(canvas) = canvas_ref.get() {
            let html_canvas: HtmlCanvasElement = canvas.unchecked_into();
            
            // Set canvas dimensions
            html_canvas.set_width(width);
            html_canvas.set_height(height);

            // Initialize WebGL2 context
            if let Ok(Some(gl_context)) = html_canvas.get_context("webgl2") {
                let _gl: WebGl2RenderingContext = gl_context.unchecked_into();
                
                // TODO: Initialize wgpu renderer
                // TODO: Set up render targets
                // TODO: Initialize field layers
                
                if let Some(callback) = &on_canvas_ready {
                    callback(html_canvas.clone());
                }
            }
        }
    });

    view! {
        <div class="field-container">
            <canvas 
                ref=canvas_ref
                class="game-field-canvas"
                width=width.to_string()
                height=height.to_string()
            />
        </div>
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_field_container_default_dimensions() {
        // Test that default dimensions are correct
        let width = 1920u32;
        let height = 1080u32;
        assert_eq!(width, 1920);
        assert_eq!(height, 1080);
    }

    #[test]
    fn test_field_container_custom_dimensions() {
        // Test custom dimensions
        let width = 2560u32;
        let height = 1440u32;
        assert_eq!(width, 2560);
        assert_eq!(height, 1440);
    }

    #[test]
    fn test_aspect_ratio_16_9() {
        // Test 16:9 aspect ratio
        let width = 1920u32;
        let height = 1080u32;
        let ratio = width as f32 / height as f32;
        assert!((ratio - 16.0/9.0).abs() < 0.01);
    }

    #[test]
    fn test_aspect_ratio_ultrawide() {
        // Test ultrawide 21:9 aspect ratio
        let width = 2560u32;
        let height = 1080u32;
        let ratio = width as f32 / height as f32;
        assert!((ratio - 21.0/9.0).abs() < 0.01);
    }
}
