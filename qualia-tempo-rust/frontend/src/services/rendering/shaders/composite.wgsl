// # Responsibility
// Composite shader - combines post-FX layers and applies tone mapping.

// Vertex shader: fullscreen triangle
struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) vertex_index: u32) -> VertexOutput {
    var output: VertexOutput;
    
    var pos = array<vec2<f32>, 3>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(3.0, -1.0),
        vec2<f32>(-1.0, 3.0)
    );
    
    output.position = vec4<f32>(pos[vertex_index], 0.0, 1.0);
    output.uv = pos[vertex_index] * vec2<f32>(0.5, -0.5) + vec2<f32>(0.5, 0.5);
    
    return output;
}

// Fragment shader: layer blending + ACES tone mapping
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    // TODO: Implement composite algorithm
    // 1. Sample lighting_hdr, bloom_hdr, god_rays_hdr at current UV
    // 2. Combine layers: base = lighting, additive = bloom + god_rays
    // 3. Apply ACES Filmic tone mapping:
    //    ACES = (x * (a*x + b)) / (x * (c*x + d) + e)
    //    where a=2.51, b=0.03, c=2.43, d=0.59, e=0.14
    // 4. Apply exposure multiplier
    // 5. Return tone-mapped LDR color
    
    // Placeholder: return dark gray
    return vec4<f32>(0.1, 0.1, 0.1, 1.0);
}
