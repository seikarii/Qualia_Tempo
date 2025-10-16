// Kawase Blur Upsample Shader
// Progressive upsampling with additive blending

@vertex
fn vs_main(@builtin(vertex_index) vertex_index: u32) -> @builtin(position) vec4<f32> {
    // Fullscreen triangle
    var pos = array<vec2<f32>, 3>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(3.0, -1.0),
        vec2<f32>(-1.0, 3.0)
    );
    return vec4<f32>(pos[vertex_index], 0.0, 1.0);
}

@fragment
fn fs_main(@builtin(position) frag_coord: vec4<f32>) -> @location(0) vec4<f32> {
    // TODO: Implement Kawase 4-tap upsample
    // Sample 4 corners at diagonal offsets
    // Combine with previous mip level (additive blending in pipeline)
    
    // Placeholder: return black
    return vec4<f32>(0.0, 0.0, 0.0, 1.0);
}
