// # Responsibility
// Bloom shader: extracts bright areas and applies gaussian blur.
//
// ---
//
// VISUALS.RUST.md §3 - Complete bloom implementation with separable gaussian blur.
// Two-pass approach: horizontal blur, then vertical blur for performance.

struct VertexOutput {
    @builtin(position) clip_position: vec4<f32>,
    @location(0) uv: vec2<f32>,
};

struct BloomUniforms {
    threshold: f32,
    intensity: f32,
    blur_radius: f32,
    _padding: f32,
};

@group(0) @binding(0) var input_texture: texture_2d<f32>;
@group(0) @binding(1) var input_sampler: sampler;
@group(0) @binding(2) var<uniform> uniforms: BloomUniforms;

@vertex
fn vs_main(@builtin(vertex_index) vertex_index: u32) -> VertexOutput {
    var output: VertexOutput;
    
    // Fullscreen triangle
    let x = f32(i32(vertex_index) - 1);
    let y = f32(i32(vertex_index & 1u) * 2 - 1);
    
    output.clip_position = vec4<f32>(x, y, 0.0, 1.0);
    output.uv = vec2<f32>((x + 1.0) * 0.5, (1.0 - y) * 0.5);
    
    return output;
}

// Bright pass: Extract HDR pixels above threshold
@fragment
fn fs_bright_pass(input: VertexOutput) -> @location(0) vec4<f32> {
    let color = textureSample(input_texture, input_sampler, input.uv);
    
    // Luminance calculation (Rec. 709)
    let brightness = dot(color.rgb, vec3<f32>(0.2126, 0.7152, 0.0722));
    
    if (brightness > uniforms.threshold) {
        // Preserve HDR values above threshold
        let bloom_color = color.rgb * (brightness - uniforms.threshold) / brightness;
        return vec4<f32>(bloom_color * uniforms.intensity, 1.0);
    } else {
        return vec4<f32>(0.0, 0.0, 0.0, 1.0);
    }
}

// Gaussian blur weights (sigma = 2.0)
const BLUR_WEIGHTS = array<f32, 5>(
    0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216
);

// Horizontal blur pass
@fragment
fn fs_blur_horizontal(input: VertexOutput) -> @location(0) vec4<f32> {
    let texel_size = 1.0 / vec2<f32>(textureDimensions(input_texture));
    var result = textureSample(input_texture, input_sampler, input.uv).rgb * BLUR_WEIGHTS[0];
    
    for (var i = 1; i < 5; i = i + 1) {
        let offset = f32(i) * texel_size.x * uniforms.blur_radius;
        result += textureSample(input_texture, input_sampler, input.uv + vec2<f32>(offset, 0.0)).rgb * BLUR_WEIGHTS[i];
        result += textureSample(input_texture, input_sampler, input.uv - vec2<f32>(offset, 0.0)).rgb * BLUR_WEIGHTS[i];
    }
    
    return vec4<f32>(result, 1.0);
}

// Vertical blur pass
@fragment
fn fs_blur_vertical(input: VertexOutput) -> @location(0) vec4<f32> {
    let texel_size = 1.0 / vec2<f32>(textureDimensions(input_texture));
    var result = textureSample(input_texture, input_sampler, input.uv).rgb * BLUR_WEIGHTS[0];
    
    for (var i = 1; i < 5; i = i + 1) {
        let offset = f32(i) * texel_size.y * uniforms.blur_radius;
        result += textureSample(input_texture, input_sampler, input.uv + vec2<f32>(0.0, offset)).rgb * BLUR_WEIGHTS[i];
        result += textureSample(input_texture, input_sampler, input.uv - vec2<f32>(0.0, offset)).rgb * BLUR_WEIGHTS[i];
    }
    
    return vec4<f32>(result, 1.0);
}
