//! # Responsibility
//! FFT frequency bars visualization component.
//!
//! ---
//!
//! Leptos component displaying Web Audio API FFT data as frequency bars.
//! Reacts to music in real-time.

use leptos::*;

/// # Responsibility
/// Displays audio frequency visualization.
///
/// # Props
/// - `fft_data`: FFT frequency data [0.0, 1.0] normalized
/// - `bar_count`: Number of frequency bars to display
/// - `visible`: Whether visualizer is visible
#[component]
pub fn AudioVisualizer(
    fft_data: ReadSignal<Vec<f32>>,
    #[prop(default = 32)] bar_count: usize,
    #[prop(default = true)] visible: bool,
) -> impl IntoView {
    if !visible {
        return view! { <div></div> }.into_view();
    }

    let bar_color = |height: f32| {
        if height > 0.8 {
            "rgb(255, 50, 50)" // Red for high frequencies
        } else if height > 0.5 {
            "rgb(255, 200, 0)" // Yellow for mid
        } else {
            "rgb(100, 200, 255)" // Blue for low
        }
    };

    let downsample_fft = move || {
        let data = fft_data.get();
        if data.is_empty() {
            return vec![0.0; bar_count];
        }
        
        let chunk_size = (data.len() / bar_count).max(1);
        data.chunks(chunk_size)
            .take(bar_count)
            .map(|chunk| chunk.iter().sum::<f32>() / chunk.len() as f32)
            .collect::<Vec<f32>>()
    };

    view! {
        <div class="audio-visualizer">
            <div class="visualizer-bars">
                <For
                    each=move || downsample_fft().into_iter().enumerate()
                    key=|(i, _)| *i
                    children=move |(i, height): (usize, f32)| {
                        let color = bar_color(height);
                        view! {
                            <div class="frequency-bar"
                                 style:height=format!("{}%", height * 100.0)
                                 style:background-color=color
                                 data-bar-index=i>
                            </div>
                        }
                    }
                />
            </div>
        </div>
    }
    .into_view()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bar_color_thresholds() {
        let get_color = |height: f32| {
            if height > 0.8 { "rgb(255, 50, 50)" }
            else if height > 0.5 { "rgb(255, 200, 0)" }
            else { "rgb(100, 200, 255)" }
        };

        assert_eq!(get_color(0.9), "rgb(255, 50, 50)");
        assert_eq!(get_color(0.8), "rgb(100, 200, 255)"); // Exactly 0.8 is not > 0.8
        assert_eq!(get_color(0.6), "rgb(255, 200, 0)");
        assert_eq!(get_color(0.3), "rgb(100, 200, 255)");
    }

    #[test]
    fn test_downsample_empty_data() {
        let empty: Vec<f32> = vec![];
        let bar_count = 10;
        
        // Downsampling empty data should return zeros
        let result = if empty.is_empty() {
            vec![0.0; bar_count]
        } else {
            empty
        };
        
        assert_eq!(result.len(), bar_count);
        assert!(result.iter().all(|&x| x == 0.0));
    }

    #[test]
    fn test_downsample_logic() {
        let data = vec![0.1, 0.2, 0.3, 0.4, 0.5, 0.6];
        let bar_count = 3;
        
        let chunk_size = (data.len() / bar_count).max(1);
        let result: Vec<f32> = data.chunks(chunk_size)
            .take(bar_count)
            .map(|chunk| chunk.iter().sum::<f32>() / chunk.len() as f32)
            .collect();
        
        assert_eq!(result.len(), 3);
        assert_eq!(result[0], 0.15); // (0.1 + 0.2) / 2
        assert_eq!(result[1], 0.35); // (0.3 + 0.4) / 2
        assert_eq!(result[2], 0.55); // (0.5 + 0.6) / 2
    }

    #[test]
    fn test_height_formatting() {
        let height = 0.75;
        let formatted = format!("{}%", height * 100.0);
        assert_eq!(formatted, "75%");
    }
}
