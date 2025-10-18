// # Responsibility
// Motion blur shader: velocity-based blur effect.
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
@group(0) @binding(1) var velocity_texture: texture_2d<f32>;
@group(0) @binding(2) var input_sampler: sampler;

@fragment
fn fs_main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = position.xy / vec2<f32>(textureDimensions(input_texture));
    let color = textureSample(input_texture, input_sampler, uv);
    let velocity = textureSample(velocity_texture, input_sampler, uv).rg;
    
    // Simple motion blur placeholder
    let num_samples = 8;
    var accumulated = color.rgb;
    
    for (var i = 1; i < num_samples; i++) {
        let offset = velocity * (f32(i) / f32(num_samples - 1));
        accumulated += textureSample(input_texture, input_sampler, uv + offset).rgb;
    }
    
    return vec4<f32>(accumulated / f32(num_samples), 1.0);
}
