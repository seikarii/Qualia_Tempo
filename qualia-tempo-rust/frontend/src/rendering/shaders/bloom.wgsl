// # Responsibility
// Bloom shader: extracts bright areas and applies gaussian blur.
//
// ---
//
// Phase 8 placeholder - full implementation per VISUALS.RUST.md follows.

@vertex
fn vs_main(@builtin(vertex_index) vertex_index: u32) -> @builtin(position) vec4<f32> {
    // Fullscreen triangle
    let x = f32(i32(vertex_index) - 1) * 2.0;
    let y = f32(i32(vertex_index & 1u) * 2 - 1) * 2.0;
    return vec4<f32>(x, y, 0.0, 1.0);
}

@group(0) @binding(0) var input_texture: texture_2d<f32>;
@group(0) @binding(2) var input_sampler: sampler;

@fragment
fn fs_main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = position.xy / vec2<f32>(textureDimensions(input_texture));
    let color = textureSample(input_texture, input_sampler, uv);
    
    // Bright pass: extract bright pixels (HDR threshold)
    let brightness = dot(color.rgb, vec3<f32>(0.2126, 0.7152, 0.0722));
    let threshold = 1.0;
    
    if (brightness > threshold) {
        return vec4<f32>(color.rgb * (brightness - threshold), 1.0);
    } else {
        return vec4<f32>(0.0, 0.0, 0.0, 1.0);
    }
}
