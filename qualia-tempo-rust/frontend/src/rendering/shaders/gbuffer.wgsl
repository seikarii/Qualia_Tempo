// # Responsibility
// G-Buffer shader for deferred rendering pipeline (VISUALS.RUST.md §2)
//
// Outputs:
// - Target 0: World-space position (xyz) + metallic (w)
// - Target 1: World-space normal (xyz) + roughness (w)
// - Target 2: Albedo color (rgb) + opacity (a)

struct VertexOutput {
    @builtin(position) clip_position: vec4<f32>,
    @location(0) world_position: vec3<f32>,
    @location(1) world_normal: vec3<f32>,
    @location(2) uv: vec2<f32>,
};

struct FragmentOutput {
    @location(0) position: vec4<f32>,
    @location(1) normal: vec4<f32>,
    @location(2) albedo: vec4<f32>,
};

@vertex
fn vs_main(
    @builtin(vertex_index) vertex_index: u32,
) -> VertexOutput {
    var output: VertexOutput;
    
    // Phase 8: Placeholder fullscreen triangle for architecture
    // Full geometry vertex processing in subsequent phases
    let x = f32(i32(vertex_index) - 1);
    let y = f32(i32(vertex_index & 1u) * 2 - 1);
    
    output.clip_position = vec4<f32>(x, y, 0.0, 1.0);
    output.world_position = vec3<f32>(x, y, 0.0);
    output.world_normal = vec3<f32>(0.0, 0.0, 1.0);
    output.uv = vec2<f32>((x + 1.0) * 0.5, (1.0 - y) * 0.5);
    
    return output;
}

@fragment
fn fs_main(input: VertexOutput) -> FragmentOutput {
    var output: FragmentOutput;
    
    // Phase 8: Placeholder geometry data
    // Full material system in subsequent phases
    output.position = vec4<f32>(input.world_position, 0.0); // metallic = 0
    output.normal = vec4<f32>(normalize(input.world_normal), 0.5); // roughness = 0.5
    output.albedo = vec4<f32>(0.2, 0.2, 0.3, 1.0); // Dark blue-gray
    
    return output;
}
