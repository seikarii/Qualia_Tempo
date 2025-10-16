// Bright Pass Extraction Shader
// Extracts pixels above luminance threshold for bloom effect

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
    // TODO: Implement bright pass extraction
    // 1. Sample HDR input texture
    // 2. Calculate luminance
    // 3. Apply threshold with soft knee
    // 4. Output bright pixels only
    
    // Placeholder: return black (no bright pixels)
    return vec4<f32>(0.0, 0.0, 0.0, 1.0);
}
