// G-Buffer Vertex Shader
@vertex
fn vs_main(@builtin(vertex_index) vertex_index: u32) -> @builtin(position) vec4<f32> {
    // Placeholder fullscreen triangle
    var positions = array<vec2<f32>, 3>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(3.0, -1.0),
        vec2<f32>(-1.0, 3.0)
    );
    
    let pos = positions[vertex_index];
    return vec4<f32>(pos, 0.0, 1.0);
}

// G-Buffer Fragment Shader - MRT outputs
struct GBufferOutput {
    @location(0) albedo_roughness: vec4<f32>,
    @location(1) normal_metallic: vec4<f32>,
    @location(2) position_ao: vec4<f32>,
}

@fragment
fn fs_main(@builtin(position) frag_coord: vec4<f32>) -> GBufferOutput {
    var output: GBufferOutput;
    
    // Placeholder: Output debug colors
    output.albedo_roughness = vec4<f32>(0.5, 0.5, 0.5, 0.5);  // Gray albedo, 0.5 roughness
    output.normal_metallic = vec4<f32>(0.0, 0.0, 1.0, 0.0);   // Up normal, no metallic
    output.position_ao = vec4<f32>(0.0, 0.0, 0.0, 1.0);      // Origin position, full AO
    
    return output;
}
